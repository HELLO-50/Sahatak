import re
from typing import Dict, Union

def validate_email(email: str) -> bool:
    """
    Validate email format using regex
    
    Args:
        email: Email string to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))

def validate_password(password: str) -> Dict[str, Union[bool, str]]:
    """
    Validate password strength
    
    Args:
        password: Password string to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if not password or not isinstance(password, str):
        return {
            'valid': False,
            'message': 'Password is required'
        }
    
    # Check minimum length
    if len(password) < 6:
        return {
            'valid': False,
            'message': 'Password must be at least 6 characters long'
        }
    
    # Check maximum length
    if len(password) > 128:
        return {
            'valid': False,
            'message': 'Password must be less than 128 characters long'
        }
    
    # Basic strength check - at least one letter and one number
    has_letter = bool(re.search(r'[a-zA-Z]', password))
    has_number = bool(re.search(r'\d', password))
    
    if not (has_letter and has_number):
        return {
            'valid': False,
            'message': 'Password must contain at least one letter and one number'
        }
    
    return {
        'valid': True,
        'message': 'Password is valid'
    }

def validate_phone(phone: str) -> bool:
    """
    Validate phone number format
    Accepts international format with + or local format
    
    Args:
        phone: Phone number string to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not phone or not isinstance(phone, str):
        return False
    
    # Remove all spaces and dashes
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone.strip())
    
    # Check for international format (+XXX) or local format
    # Allow 8-15 digits, optionally starting with +
    pattern = r'^\+?[1-9]\d{7,14}$'
    return bool(re.match(pattern, clean_phone))

def validate_name(name: str, min_length: int = 2, max_length: int = 50) -> Dict[str, Union[bool, str]]:
    """
    Validate name field
    
    Args:
        name: Name string to validate
        min_length: Minimum length (default: 2)
        max_length: Maximum length (default: 50)
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if not name or not isinstance(name, str):
        return {
            'valid': False,
            'message': 'Name is required'
        }
    
    name = name.strip()
    
    if len(name) < min_length:
        return {
            'valid': False,
            'message': f'Name must be at least {min_length} characters long'
        }
    
    if len(name) > max_length:
        return {
            'valid': False,
            'message': f'Name must be less than {max_length} characters long'
        }
    
    # Allow letters, spaces, hyphens, apostrophes, and Arabic characters
    pattern = r"^[a-zA-Z\u0600-\u06FF\s\-'\.]+$"
    if not re.match(pattern, name):
        return {
            'valid': False,
            'message': 'Name contains invalid characters'
        }
    
    return {
        'valid': True,
        'message': 'Name is valid'
    }

def validate_age(age: Union[int, str]) -> Dict[str, Union[bool, str]]:
    """
    Validate age
    
    Args:
        age: Age to validate (int or string)
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    try:
        age_int = int(age)
    except (ValueError, TypeError):
        return {
            'valid': False,
            'message': 'Age must be a valid number'
        }
    
    if age_int < 1:
        return {
            'valid': False,
            'message': 'Age must be at least 1'
        }
    
    if age_int > 120:
        return {
            'valid': False,
            'message': 'Age must be less than 120'
        }
    
    return {
        'valid': True,
        'message': 'Age is valid'
    }

def validate_license_number(license_number: str) -> Dict[str, Union[bool, str]]:
    """
    Validate medical license number
    
    Args:
        license_number: License number to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if not license_number or not isinstance(license_number, str):
        return {
            'valid': False,
            'message': 'License number is required'
        }
    
    license_number = license_number.strip()
    
    if len(license_number) < 3:
        return {
            'valid': False,
            'message': 'License number must be at least 3 characters long'
        }
    
    if len(license_number) > 50:
        return {
            'valid': False,
            'message': 'License number must be less than 50 characters long'
        }
    
    # Allow alphanumeric characters, hyphens, and slashes
    pattern = r'^[a-zA-Z0-9\-\/]+$'
    if not re.match(pattern, license_number):
        return {
            'valid': False,
            'message': 'License number contains invalid characters'
        }
    
    return {
        'valid': True,
        'message': 'License number is valid'
    }

def validate_specialty(specialty: str) -> Dict[str, Union[bool, str]]:
    """
    Validate medical specialty
    
    Args:
        specialty: Medical specialty to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    valid_specialties = [
        'cardiology', 'pediatrics', 'dermatology', 'internal', 
        'psychiatry', 'orthopedics', 'general', 'neurology',
        'gynecology', 'ophthalmology', 'ent', 'surgery',
        'radiology', 'pathology', 'anesthesiology', 'emergency'
    ]
    
    if not specialty or not isinstance(specialty, str):
        return {
            'valid': False,
            'message': 'Specialty is required'
        }
    
    if specialty.lower() not in valid_specialties:
        return {
            'valid': False,
            'message': f'Invalid specialty. Must be one of: {", ".join(valid_specialties)}'
        }
    
    return {
        'valid': True,
        'message': 'Specialty is valid'
    }

def sanitize_input(text: str, max_length: int = None) -> str:
    """
    Sanitize text input by trimming and optionally limiting length
    
    Args:
        text: Text to sanitize
        max_length: Maximum length to truncate to (optional)
        
    Returns:
        str: Sanitized text
    """
    if not text or not isinstance(text, str):
        return ''
    
    # Strip whitespace
    sanitized = text.strip()
    
    # Limit length if specified
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length].strip()
    
    return sanitized