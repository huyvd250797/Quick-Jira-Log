"""Optional QA: render the actual WebGL shaders with surfaceless Mesa EGL.
Requires Python Pillow and libEGL (no browser or application dependency).
"""
import ctypes as c, re, hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
E=c.CDLL('libEGL.so.1')
E.eglGetProcAddress.argtypes=[c.c_char_p];E.eglGetProcAddress.restype=c.c_void_p
def egl(name,restype,args):
 f=getattr(E,name);f.restype=restype;f.argtypes=args;return f
ptr=c.c_void_p; integer=c.c_int
platform=c.CFUNCTYPE(ptr,c.c_uint,ptr,c.POINTER(integer))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display=platform(0x31DD,None,None)
assert egl('eglInitialize',integer,[ptr,ptr,ptr])(display,None,None),'No surfaceless EGL'
assert egl('eglBindAPI',integer,[c.c_uint])(0x30A0)
attrs=(integer*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
config=ptr();number=integer()
assert egl('eglChooseConfig',integer,[ptr,ptr,ptr,integer,ptr])(display,attrs,c.byref(config),1,c.byref(number)) and number.value
pattrs=(integer*5)(0x3057,408,0x3056,136,0x3038)
surface=egl('eglCreatePbufferSurface',ptr,[ptr,ptr,ptr])(display,config,pattrs)
context=egl('eglCreateContext',ptr,[ptr,ptr,ptr,ptr])(display,config,None,(integer*3)(0x3098,2,0x3038))
assert egl('eglMakeCurrent',integer,[ptr,ptr,ptr,ptr])(display,surface,surface,context)
def gl(name,restype,args): return c.CFUNCTYPE(restype,*args)(E.eglGetProcAddress(name.encode()))
create=gl('glCreateShader',c.c_uint,[c.c_uint]);source=gl('glShaderSource',None,[c.c_uint,integer,ptr,ptr]);compile_=gl('glCompileShader',None,[c.c_uint]);get=gl('glGetShaderiv',None,[c.c_uint,c.c_uint,ptr]);log=gl('glGetShaderInfoLog',None,[c.c_uint,integer,ptr,ptr])
text=(root/'seasonal-shader.js').read_text();frag=re.search(r'const fragment = `([\s\S]*?)`;',text)[1];vert=re.search(r'gl.VERTEX_SHADER, `([\s\S]*?)`',text)[1]
def shader(kind,text):
 s=create(kind);b=text.encode();p=c.c_char_p(b);source(s,1,c.byref(p),None);compile_(s);ok=integer();get(s,0x8B81,c.byref(ok));
 if not ok.value:
  buf=c.create_string_buffer(8192);log(s,8192,None,buf);raise AssertionError(buf.value.decode())
 return s
program=gl('glCreateProgram',c.c_uint,[])();attach=gl('glAttachShader',None,[c.c_uint,c.c_uint]);attach(program,shader(0x8B31,vert));attach(program,shader(0x8B30,frag));gl('glLinkProgram',None,[c.c_uint])(program)
ok=integer();gl('glGetProgramiv',None,[c.c_uint,c.c_uint,ptr])(program,0x8B82,c.byref(ok));assert ok.value,'Link failure'
gl('glUseProgram',None,[c.c_uint])(program)
loc=gl('glGetUniformLocation',integer,[c.c_uint,c.c_char_p]);u1=gl('glUniform1f',None,[integer,c.c_float]);u2=gl('glUniform2f',None,[integer,c.c_float,c.c_float]);ui=gl('glUniform1i',None,[integer,integer])
def uniform(name,value):u1(loc(program,name.encode()),value)
v=(c.c_float*8)(-1,-1,1,-1,-1,1,1,1);a=gl('glGetAttribLocation',integer,[c.c_uint,c.c_char_p])(program,b'vertex');gl('glEnableVertexAttribArray',None,[c.c_uint])(a);gl('glVertexAttribPointer',None,[c.c_uint,integer,c.c_uint,c.c_ubyte,integer,ptr])(a,2,0x1406,0,0,v)
t= c.c_uint();gl('glGenTextures',None,[integer,ptr])(1,c.byref(t));gl('glBindTexture',None,[c.c_uint,c.c_uint])(0x0DE1,t)
for key,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]: gl('glTexParameteri',None,[c.c_uint,c.c_uint,integer])(0x0DE1,key,value)
ui(loc(program,b'image'),0);u2(loc(program,b'fit'),1,1)
output=Path('/tmp/qjl1405-qa');output.mkdir(exist_ok=True)
for theme,kind,scene in [('national',6,-1),('womensday',7,0),('vietwomen',7,1),('family',7,2),('hungking',7,3)]:
 im=Image.open(root/('seasonal-collection' if kind==6 else 'seasonal-banners')/(theme+'.webp')).convert('RGBA');data=im.tobytes();gl('glTexImage2D',None,[c.c_uint,integer,integer,integer,integer,integer,c.c_uint,c.c_uint,ptr])(0x0DE1,0,0x1908,im.width,im.height,0,0x1908,0x1401,c.c_char_p(data))
 ui(loc(program,b'kind'),kind);uniform('scene',scene);uniform('variant',0)
 w,h=(136,136) if kind==6 else (408,136);gl('glViewport',None,[integer,integer,integer,integer])(0,0,w,h)
 for mode in ([0] if kind==6 else [0,1]):
  uniform('lightMode',mode);frames=[]
  for seconds in [0,.8,1.6]:
   uniform('time',seconds);gl('glDrawArrays',None,[c.c_uint,integer,integer])(5,0,4)
   pixels=(c.c_ubyte*(w*h*4))();gl('glReadPixels',None,[integer,integer,integer,integer,c.c_uint,c.c_uint,ptr])(0,0,w,h,0x1908,0x1401,pixels)
   raw=bytes(pixels);frames.append(raw)
   Image.frombytes('RGBA',(w,h),raw).transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(output/(theme+'-'+str(mode)+'-'+str(seconds)+'.png'))
  assert len(set(hashlib.sha256(f).digest() for f in frames))==3,theme+' has no time-driven motion'
  if kind==7:
   # Outside the selected living-object field, source pixels must be identical.
   assert frames[0][0:408*4]==frames[1][0:408*4],theme+' must preserve image boundary'
  else:
   assert any(frames[0][i]>200 for i in range(3,len(frames[0]),4)),'Flag disappeared'
   assert any(frames[0][i]==0 for i in range(3,len(frames[0]),4)),'Alpha must not turn black'
print('PASS: actual GLSL compile/link and 27 GPU frames across 9 scene/mode combinations; timestamp motion and static boundaries verified.')
