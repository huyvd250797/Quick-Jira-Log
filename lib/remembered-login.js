(function(root){
  'use strict';
  const DB_NAME='quick-jira-log-device-login-v1',STORE='credentials',RECORD='remembered-login';
  const encoder=new TextEncoder(),decoder=new TextDecoder(),context=encoder.encode('Quick Jira Log remembered login v1');
  let pending=Promise.resolve();
  function supported(){try{return Boolean(root.crypto?.subtle&&root.indexedDB);}catch{return false;}}
  function serialize(job){const result=pending.then(job);pending=result.catch(()=>{});return result;}
  function open(){return new Promise((resolve,reject)=>{
    let request,done=false;
    const finish=(error,db)=>{if(done){db?.close();return;}done=true;clearTimeout(timer);error?reject(error):resolve(db);};
    const timer=setTimeout(()=>finish(new Error('Không truy cập được bộ nhớ đăng nhập trên thiết bị.')),3000);
    try{request=root.indexedDB.open(DB_NAME,1);}catch(error){finish(error);return;}
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
    request.onerror=()=>finish(request.error||new Error('Không mở được bộ nhớ đăng nhập.'));
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();finish(null,db);};
  });}
  async function transaction(mode,operation){
    const db=await open();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);let result;
      const timer=setTimeout(()=>{try{tx.abort();}catch{}reject(new Error('Không truy cập được bộ nhớ đăng nhập trên thiết bị.'));},3000);
      tx.oncomplete=()=>{clearTimeout(timer);resolve(result);};
      tx.onerror=tx.onabort=()=>{clearTimeout(timer);reject(tx.error||new Error('Không lưu được đăng nhập trên thiết bị.'));};
      try{const request=operation(tx.objectStore(STORE));if(request)request.onsuccess=()=>{result=request.result;};}catch(error){clearTimeout(timer);try{tx.abort();}catch{}reject(error);}
    });}finally{db.close();}
  }
  async function remove(){if(!root.indexedDB)return;await transaction('readwrite',store=>store.delete(RECORD));}
  const api={
    supported,
    save(username,password){return serialize(async()=>{
      if(!supported())throw new Error('Trình duyệt không hỗ trợ lưu đăng nhập có mã hóa.');
      if(typeof username!=='string'||!username.trim()||typeof password!=='string'||!password)throw new Error('Thông tin đăng nhập không hợp lệ.');
      const key=await root.crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
      const iv=root.crypto.getRandomValues(new Uint8Array(12));
      const ciphertext=await root.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context},key,encoder.encode(JSON.stringify({username:username.trim(),password})));
      // CryptoKey is non-extractable and is structured-cloned into this origin's IndexedDB.
      await transaction('readwrite',store=>store.put({version:1,key,iv,ciphertext},RECORD));
    });},
    load(){return serialize(async()=>{
      if(!supported())return null;
      const record=await transaction('readonly',store=>store.get(RECORD));
      if(!record)return null;
      try{
        if(record.version!==1||record.key?.extractable!==false)throw new Error('INVALID_RECORD');
        const plaintext=await root.crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData:context},record.key,record.ciphertext);
        const value=JSON.parse(decoder.decode(plaintext));
        if(typeof value.username!=='string'||!value.username||typeof value.password!=='string'||!value.password)throw new Error('INVALID_RECORD');
        return value;
      }catch{
        await remove();
        throw new Error('Thông tin đăng nhập đã lưu không còn hợp lệ. Hãy nhập và lưu lại.');
      }
    });},
    clear(){return serialize(remove);}
  };
  root.QuickJiraCredentials=Object.freeze(api);
})(globalThis);
