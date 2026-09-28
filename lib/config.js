'use strict';

const JIRA_BASE_URL = 'https://task.ascvn.com.vn';
const JIRA_FILTER_NAME = '[HuyVo] - No Work Logged';
const FILTER_MAX_ISSUES = 500;
const WORK_WINDOWS = [
  { start: '08:00', end: '12:00' },
  { start: '13:30', end: '17:30' }
];
const TIMEZONE_OFFSET = '+0700';
const MAX_DAILY_MINUTES = 8 * 60;

module.exports = {
  JIRA_BASE_URL,
  JIRA_FILTER_NAME,
  FILTER_MAX_ISSUES,
  WORK_WINDOWS,
  TIMEZONE_OFFSET,
  MAX_DAILY_MINUTES
};
