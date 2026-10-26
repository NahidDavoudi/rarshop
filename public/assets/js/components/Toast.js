import { toast as showToast } from '../utils/helpers.js';

const Toast = {
  show(msg, type = 'success', duration = 3000) {
    showToast(msg, type, duration);
  },
};

export default Toast;
