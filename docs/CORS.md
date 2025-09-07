# CORS (Cross-Origin Resource Sharing) in Sahatak

## What is CORS?

CORS is a security mechanism implemented by web browsers that controls how web pages from one domain can access resources from another domain. It's crucial for the Sahatak platform because the frontend and backend are served from different origins.

## Why CORS is Needed in Sahatak

The Sahatak architecture separates the frontend and backend:

- **Frontend**: Served from GitHub Pages (`https://hello-50.github.io`)
- **Backend API**: Hosted on PythonAnywhere (`https://sahatak.pythonanywhere.com`)

When JavaScript code from the frontend tries to make API calls to the backend, the browser blocks these requests by default due to the Same-Origin Policy. CORS configuration allows these cross-origin requests to work.

## CORS Implementation

### Backend Configuration

The backend uses Flask-CORS to handle cross-origin requests:

#### Installation and Setup (`backend/app.py`)
```python
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)

# Configure CORS with specific settings
CORS(app, 
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://hello-50.github.io",
                "https://sahatak.pythonanywhere.com"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Content-Type",
                "Authorization",
                "Accept-Language",
                "X-Timestamp"
            ],
            "supports_credentials": True,
            "max_age": 3600
        }
    }
)
```

### CORS Headers Explained

#### Allowed Origins (`backend/app.py`)
Specifies which domains can access the API:
```python
"origins": [
    "http://localhost:*",           # Local development
    "http://127.0.0.1:*",           # Alternative localhost
    "https://hello-50.github.io",   # Production frontend
    "https://sahatak.pythonanywhere.com"  # Backend self-reference
]
```

#### Allowed Methods
HTTP methods that can be used for cross-origin requests:
```python
"methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
```
- **OPTIONS**: Used for preflight requests to check CORS permissions

#### Allowed Headers
Headers that the frontend can send:
```python
"allow_headers": [
    "Content-Type",      # JSON/form data specification
    "Authorization",     # JWT Bearer tokens
    "Accept-Language",   # Language preference (ar/en)
    "X-Timestamp"        # Request timestamp for caching
]
```

#### Credentials Support
```python
"supports_credentials": True
```
Allows cookies and authorization headers to be included in cross-origin requests.

### Frontend API Calls

The frontend includes credentials in all API requests (`frontend/assets/js/main.js`):

```javascript
const ApiHelper = {
    baseUrl: 'https://sahatak.pythonanywhere.com/api',
    
    async makeRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': language,
                'X-Timestamp': Date.now().toString(),
                ...authHeaders
            },
            credentials: 'include'  // Important for CORS with cookies
        };
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
        return response;
    }
}
```

## CORS Preflight Requests

For complex requests, browsers send a preflight OPTIONS request first:

### Preflight Flow
1. Browser sends OPTIONS request to check permissions
2. Backend responds with allowed methods and headers
3. If allowed, browser sends the actual request

### Handling Preflight (`backend/app.py`)
Flask-CORS automatically handles OPTIONS requests:
```python
# Automatic response to OPTIONS requests
# Returns headers:
# - Access-Control-Allow-Origin
# - Access-Control-Allow-Methods
# - Access-Control-Allow-Headers
# - Access-Control-Max-Age
```

## Common CORS Scenarios in Sahatak

### 1. Login Request
```javascript
// frontend/assets/js/components/forms.js
await fetch('https://sahatak.pythonanywhere.com/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(loginData)
});
```

### 2. Authenticated API Call with JWT
```javascript
// frontend/assets/js/main.js
await fetch('https://sahatak.pythonanywhere.com/api/appointments', {
    method: 'GET',
    headers: {
        'Authorization': 'Bearer eyJhbGci...',
        'Content-Type': 'application/json'
    },
    credentials: 'include'
});
```

### 3. File Upload
```javascript
// frontend/assets/js/components/ehr-manager.js
await fetch('https://sahatak.pythonanywhere.com/api/medical-records/upload', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer eyJhbGci...'
        // Content-Type is NOT set for FormData
    },
    credentials: 'include',
    body: formData  // FormData object
});
```

## CORS Security Considerations

### 1. Specific Origin Whitelist
Instead of using wildcard (`*`), specific origins are listed:
```python
# Good - Specific origins
"origins": ["https://hello-50.github.io"]

# Bad - Too permissive
"origins": "*"
```

### 2. Credentials Handling
When `supports_credentials: True`:
- Cannot use wildcard origins
- Must specify exact origins
- Cookies and auth headers are included

### 3. Max Age Setting
```python
"max_age": 3600  # Cache preflight for 1 hour
```
Reduces preflight requests by caching CORS permissions.

## CORS Error Troubleshooting

### Common CORS Errors

#### 1. "No 'Access-Control-Allow-Origin' header"
**Cause**: Backend not configured for the requesting origin
**Solution**: Add origin to allowed list in `backend/app.py`

#### 2. "CORS policy: credentials flag is 'true'"
**Cause**: Using wildcard origin with credentials
**Solution**: Specify exact origins instead of wildcard

#### 3. "Method not allowed by Access-Control-Allow-Methods"
**Cause**: Using HTTP method not in allowed list
**Solution**: Add method to CORS configuration

#### 4. "Request header field not allowed"
**Cause**: Sending header not in allow_headers list
**Solution**: Add header to allowed headers in `backend/app.py`

### Debugging CORS

Check browser console for CORS errors:
```javascript
// Browser console will show:
// "Access to fetch at 'https://sahatak.pythonanywhere.com/api/...' 
//  from origin 'https://hello-50.github.io' has been blocked by CORS policy"
```

Check network tab for OPTIONS requests:
- Look for preflight OPTIONS requests
- Check response headers for Access-Control-* headers

## Development vs Production CORS

### Development Configuration
During development, localhost is allowed:
```python
"origins": [
    "http://localhost:*",
    "http://127.0.0.1:*"
]
```

### Production Configuration
In production, only specific domains:
```python
"origins": [
    "https://hello-50.github.io",
    "https://sahatak.pythonanywhere.com"
]
```

## WebSocket CORS

For real-time features like messaging (`backend/routes/socketio_events.py`):

```python
from flask_socketio import SocketIO

socketio = SocketIO(
    app,
    cors_allowed_origins=[
        "http://localhost:*",
        "https://hello-50.github.io"
    ],
    async_mode='threading'
)
```

## Best Practices

1. **Be Specific with Origins**: List exact domains rather than wildcards
2. **Use HTTPS**: Always use HTTPS in production for security
3. **Limit Methods**: Only allow necessary HTTP methods
4. **Restrict Headers**: Only allow required headers
5. **Cache Preflight**: Set appropriate max_age to reduce requests
6. **Monitor CORS Errors**: Log CORS failures for debugging
7. **Environment-Based Config**: Different CORS settings for dev/prod


## Summary

CORS in Sahatak enables the separated frontend/backend architecture while maintaining security. The configuration allows the GitHub Pages frontend to communicate with the PythonAnywhere backend API, supporting features like:

- JWT authentication with Bearer tokens
- Session cookies for state management
- Multi-language support via Accept-Language header
- File uploads for medical records
- Real-time messaging via WebSockets

The CORS setup is essential for the platform's functionality, enabling secure cross-origin communication while protecting against unauthorized access.