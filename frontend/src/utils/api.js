import axios from 'axios';
import CONFIG from '../config';

const api = axios.create({
    baseURL: CONFIG.API_BASE_URL,
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const { token } = JSON.parse(userInfo);
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error('SECURITY ALERT: Backend returned 401 (Unauthorized). Logging out user...');
            console.log('Failing URL:', error.config.url);
            console.log('Current localStorage info:', localStorage.getItem('userInfo'));
            
            localStorage.removeItem('userInfo');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
