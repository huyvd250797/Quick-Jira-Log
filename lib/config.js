'use strict';

const JIRA_BASE_URL = 'https://task.ascvn.com.vn';
const FILTER_MAX_ISSUES = 500;
const FILTER_MAX_FILTERS = 100;
const BULK_MAX_ITEMS = 20;
const WORK_WINDOWS = [
  { start: '08:00', end: '12:00' },
  { start: '13:30', end: '17:30' }
];
const TIMEZONE_OFFSET = '+0700';
const WORK_TIMEZONE = 'Asia/Ho_Chi_Minh';
const MAX_DAILY_MINUTES = 8 * 60;

module.exports = {
  JIRA_BASE_URL,
  FILTER_MAX_ISSUES,
  FILTER_MAX_FILTERS,
  BULK_MAX_ITEMS,
  WORK_WINDOWS,
  TIMEZONE_OFFSET,
  WORK_TIMEZONE,
  MAX_DAILY_MINUTES
};
