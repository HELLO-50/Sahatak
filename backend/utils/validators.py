import re
from datetime import datetime
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
    
    # Allow 'admin' as a special case username
    if email.strip().lower() == 'admin':
        return True
    
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
    
    from utils.settings_manager import get_validation_setting
    
    # Get configurable limits (Database > Environment > Default)
    min_length = get_validation_setting('password_min_length', 6, 'integer')
    max_length = get_validation_setting('password_max_length', 128, 'integer')
    
    # Check minimum length
    if len(password) < min_length:
        return {
            'valid': False,
            'message': f'Password must be at least {min_length} characters long'
        }
    
    # Check maximum length
    if len(password) > max_length:
        return {
            'valid': False,
            'message': f'Password must be less than {max_length} characters long'
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

def validate_phone(phone: str) -> Dict[str, Union[bool, str]]:
    """
    Validate phone number format
    Accepts international format with + or local format
    
    Args:
        phone: Phone number string to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if not phone or not isinstance(phone, str):
        return {
            'valid': False,
            'message': 'Phone number is required'
        }
    
    from flask import current_app
    
    # Get configurable limits
    min_length = getattr(current_app.config, 'PHONE_MIN_LENGTH', 10)
    max_length = getattr(current_app.config, 'PHONE_MAX_LENGTH', 15)
    
    # Remove all spaces and dashes
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone.strip())
    
    # Check length
    if len(clean_phone) < min_length:
        return {
            'valid': False,
            'message': f'Phone number must be at least {min_length} digits'
        }
    
    if len(clean_phone) > max_length:
        return {
            'valid': False,
            'message': f'Phone number must be less than {max_length} digits'
        }
    
    # Check for international format (+XXX) or local format
    pattern = r'^\+?[1-9]\d{7,14}$'
    if not re.match(pattern, clean_phone):
        return {
            'valid': False,
            'message': 'Invalid phone number format'
        }
    
    return {
        'valid': True,
        'message': 'Phone number is valid'
    }

def validate_full_name(full_name: str) -> Dict[str, Union[bool, str]]:
    """
    Validate full name field (replaces separate first_name/last_name validation)
    
    Args:
        full_name: Full name string to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if not full_name or not isinstance(full_name, str):
        return {
            'valid': False,
            'message': 'Full name is required'
        }
    
    from flask import current_app
    
    # Get configurable limits
    min_length = getattr(current_app.config, 'NAME_MIN_LENGTH', 2)
    max_length = getattr(current_app.config, 'NAME_MAX_LENGTH', 100)
    
    full_name = full_name.strip()
    
    if len(full_name) < min_length:
        return {
            'valid': False,
            'message': f'Full name must be at least {min_length} characters long'
        }
    
    if len(full_name) > max_length:
        return {
            'valid': False,
            'message': f'Full name must be less than {max_length} characters long'
        }
    
    # Allow letters, spaces, hyphens, apostrophes, dots, and Arabic characters
    # More permissive for full names which may contain multiple words
    pattern = r"^[a-zA-Z\u0600-\u06FF\s\-'\.]+$"
    if not re.match(pattern, full_name):
        return {
            'valid': False,
            'message': 'Full name contains invalid characters'
        }
    
    # Ensure it contains at least one space (indicating first + last name)
    if ' ' not in full_name:
        return {
            'valid': False,
            'message': 'Please enter your full name (first and last name)'
        }
    
    return {
        'valid': True,
        'message': 'Full name is valid'
    }

def validate_name(name: str, min_length: int = 2, max_length: int = 50) -> Dict[str, Union[bool, str]]:
    """
    Validate individual name field (kept for backwards compatibility)
    For new implementations, use validate_full_name instead
    
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

def validate_date(date_str: str) -> Dict[str, Union[bool, str]]:
    """
    Validate date string in YYYY-MM-DD format
    
    Args:
        date_str: Date string to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if not date_str or not isinstance(date_str, str):
        return {
            'valid': False,
            'message': 'Date is required'
        }
    
    try:
        from datetime import datetime
        datetime.strptime(date_str, '%Y-%m-%d')
        return {
            'valid': True,
            'message': 'Date is valid'
        }
    except ValueError:
        return {
            'valid': False,
            'message': 'Invalid date format. Use YYYY-MM-DD'
        }
def validate_time(time_str: str) -> Dict[str, Union[bool, str]]:
    """
    Validate time string in HH:MM format (24-hour clock)
    
    Args:
        time_str: Time string to validate
    
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if not time_str or not isinstance(time_str, str):
        return {
            'valid': False,
            'message': 'Time is required'
        }
    
    try:
        datetime.strptime(time_str, '%H:%M')
        return {
            'valid': True,
            'message': 'Time is valid'
        }
    except ValueError:
        return {
            'valid': False,
            'message': 'Invalid time format. Use HH:MM (24-hour clock)'
        }
    
def validate_appointment_type(appointment_type: str) -> Dict[str, Union[bool, str]]:
    """
    Validate appointment type
    
    Args:
        appointment_type: Appointment type to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    valid_types = ['video', 'audio', 'chat']
    
    if not appointment_type or not isinstance(appointment_type, str):
        return {
            'valid': False,
            'message': 'Appointment type is required'
        }
    
    if appointment_type.lower() not in valid_types:
        return {
            'valid': False,
            'message': f'Invalid appointment type. Must be one of: {", ".join(valid_types)}'
        }
    
    return {
        'valid': True,
        'message': 'Appointment type is valid'
    }

def validate_prescription_data(prescription_data: dict) -> Dict[str, Union[bool, str]]:
    """
    Validate prescription data
    
    Args:
        prescription_data: Dictionary containing prescription details
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    required_fields = ['medication_name', 'dosage', 'frequency', 'duration']
    
    # Check for required fields
    for field in required_fields:
        if not prescription_data.get(field):
            return {
                'valid': False,
                'message': f'{field.replace("_", " ").title()} is required'
            }
    
    # Validate medication name
    medication_name = prescription_data.get('medication_name', '').strip()
    if len(medication_name) < 2 or len(medication_name) > 200:
        return {
            'valid': False,
            'message': 'Medication name must be between 2 and 200 characters'
        }
    
    # Validate dosage
    dosage = prescription_data.get('dosage', '').strip()
    if len(dosage) < 1 or len(dosage) > 100:
        return {
            'valid': False,
            'message': 'Dosage must be between 1 and 100 characters'
        }
    
    # Validate frequency
    frequency = prescription_data.get('frequency', '').strip()
    if len(frequency) < 1 or len(frequency) > 100:
        return {
            'valid': False,
            'message': 'Frequency must be between 1 and 100 characters'
        }
    
    # Validate duration
    duration = prescription_data.get('duration', '').strip()
    if len(duration) < 1 or len(duration) > 100:
        return {
            'valid': False,
            'message': 'Duration must be between 1 and 100 characters'
        }
    
    # Validate optional fields if provided
    if 'quantity' in prescription_data and prescription_data['quantity']:
        quantity = prescription_data['quantity'].strip()
        if len(quantity) > 50:
            return {
                'valid': False,
                'message': 'Quantity must be less than 50 characters'
            }
    
    if 'instructions' in prescription_data and prescription_data['instructions']:
        instructions = prescription_data['instructions'].strip()
        if len(instructions) > 1000:
            return {
                'valid': False,
                'message': 'Instructions must be less than 1000 characters'
            }
    
    if 'notes' in prescription_data and prescription_data['notes']:
        notes = prescription_data['notes'].strip()
        if len(notes) > 1000:
            return {
                'valid': False,
                'message': 'Notes must be less than 1000 characters'
            }
    
    # Validate refills if provided
    if 'refills_allowed' in prescription_data:
        try:
            refills = int(prescription_data['refills_allowed'])
            if refills < 0 or refills > 10:
                return {
                    'valid': False,
                    'message': 'Refills allowed must be between 0 and 10'
                }
        except (ValueError, TypeError):
            return {
                'valid': False,
                'message': 'Refills allowed must be a valid number'
            }
    
    return {
        'valid': True,
        'message': 'Prescription data is valid'
    }

def validate_prescription_status(status: str) -> Dict[str, Union[bool, str]]:
    """
    Validate prescription status
    
    Args:
        status: Status to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    valid_statuses = ['active', 'completed', 'cancelled', 'expired']
    
    if not status or not isinstance(status, str):
        return {
            'valid': False,
            'message': 'Status is required'
        }
    
    if status.lower() not in valid_statuses:
        return {
            'valid': False,
            'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
        }
    
    return {
        'valid': True,
        'message': 'Status is valid'
    }

def validate_json_data(data: dict, required_fields: list) -> Dict[str, Union[bool, str]]:
    """
    Validate JSON data contains required fields
    
    Args:
        data: Dictionary to validate
        required_fields: List of required field names
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if not data or not isinstance(data, dict):
        return {
            'valid': False,
            'message': 'Invalid data provided'
        }
    
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None or (isinstance(data[field], str) and not data[field].strip()):
            missing_fields.append(field)
    
    if missing_fields:
        return {
            'valid': False,
            'message': f'Missing required fields: {", ".join(missing_fields)}'
        }
    
    return {
        'valid': True,
        'message': 'Data is valid'
    }

def validate_medical_history_data(medical_data: dict) -> Dict[str, Union[bool, str]]:
    """
    Validate comprehensive medical history data
    
    Args:
        medical_data: Dictionary containing medical history details
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    # Validate smoking status if provided
    if 'smoking_status' in medical_data and medical_data['smoking_status']:
        valid_smoking = ['never', 'former', 'current']
        if medical_data['smoking_status'] not in valid_smoking:
            return {
                'valid': False,
                'message': f'Invalid smoking status. Must be one of: {", ".join(valid_smoking)}'
            }
    
    # Validate alcohol consumption if provided
    if 'alcohol_consumption' in medical_data and medical_data['alcohol_consumption']:
        valid_alcohol = ['none', 'occasional', 'moderate', 'heavy']
        if medical_data['alcohol_consumption'] not in valid_alcohol:
            return {
                'valid': False,
                'message': f'Invalid alcohol consumption. Must be one of: {", ".join(valid_alcohol)}'
            }
    
    # Validate exercise frequency if provided
    if 'exercise_frequency' in medical_data and medical_data['exercise_frequency']:
        valid_exercise = ['none', 'rare', 'weekly', 'daily']
        if medical_data['exercise_frequency'] not in valid_exercise:
            return {
                'valid': False,
                'message': f'Invalid exercise frequency. Must be one of: {", ".join(valid_exercise)}'
            }
    
    # Validate height if provided (in cm)
    if 'height' in medical_data and medical_data['height']:
        try:
            height = float(medical_data['height'])
            if height < 30 or height > 300:  # Reasonable range
                return {
                    'valid': False,
                    'message': 'Height must be between 30 and 300 cm'
                }
        except (ValueError, TypeError):
            return {
                'valid': False,
                'message': 'Height must be a valid number'
            }
    
    # Validate weight if provided (in kg)
    if 'weight' in medical_data and medical_data['weight']:
        try:
            weight = float(medical_data['weight'])
            if weight < 1 or weight > 1000:  # Reasonable range
                return {
                    'valid': False,
                    'message': 'Weight must be between 1 and 1000 kg'
                }
        except (ValueError, TypeError):
            return {
                'valid': False,
                'message': 'Weight must be a valid number'
            }
    
    # Validate text fields length (strict limits to prevent abuse)
    text_fields = {
        'medical_history': 5000,       # Increased for comprehensive history
        'allergies': 1500,             # Detailed allergy information
        'current_medications': 2000,   # Multiple medications with dosages
        'chronic_conditions': 1500,    # Multiple conditions with details
        'family_history': 3000,        # Extended family medical history
        'surgical_history': 2500,      # Multiple surgeries with details
        'symptoms': 1000,              # Appointment symptoms
        'reason_for_visit': 500,       # Brief reason for visit
        'notes': 2000,                 # General medical notes
        'diagnosis': 1500,             # Detailed diagnosis
        'treatment_plan': 2000,        # Comprehensive treatment plan
        'prescription_instructions': 1000,  # Medication instructions
        'prescription_notes': 500      # Additional prescription notes
    }
    
    for field, max_length in text_fields.items():
        if field in medical_data and medical_data[field]:
            if len(str(medical_data[field])) > max_length:
                return {
                    'valid': False,
                    'message': f'{field.replace("_", " ").title()} must be less than {max_length} characters'
                }
    
    return {
        'valid': True,
        'message': 'Medical history data is valid'
    }

def validate_blood_type(blood_type: str) -> Dict[str, Union[bool, str]]:
    """
    Validate blood type
    
    Args:
        blood_type: Blood type to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    valid_blood_types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    
    if not blood_type or not isinstance(blood_type, str):
        return {
            'valid': True,  # Blood type is optional
            'message': 'Blood type is optional'
        }
    
    if blood_type.upper() not in valid_blood_types:
        return {
            'valid': False,
            'message': f'Invalid blood type. Must be one of: {", ".join(valid_blood_types)}'
        }
    
    return {
        'valid': True,
        'message': 'Blood type is valid'
    }

def validate_history_update_type(update_type: str) -> Dict[str, Union[bool, str]]:
    """
    Validate medical history update type
    
    Args:
        update_type: Update type to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    valid_types = ['initial_registration', 'appointment_update', 'patient_self_update', 'doctor_update']
    
    if not update_type or not isinstance(update_type, str):
        return {
            'valid': False,
            'message': 'Update type is required'
        }
    
    if update_type not in valid_types:
        return {
            'valid': False,
            'message': f'Invalid update type. Must be one of: {", ".join(valid_types)}'
        }
    
    return {
        'valid': True,
        'message': 'Update type is valid'
    }

def validate_doctor_participation_data(participation_data: dict) -> Dict[str, Union[bool, str]]:
    """
    Validate doctor participation and fee data
    
    Args:
        participation_data: Dictionary containing participation details
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    # Validate participation type
    if 'participation_type' in participation_data:
        valid_types = ['volunteer', 'paid']
        if participation_data['participation_type'] not in valid_types:
            return {
                'valid': False,
                'message': f'Invalid participation type. Must be one of: {", ".join(valid_types)}'
            }
    
    # Validate consultation fee
    if 'consultation_fee' in participation_data:
        try:
            fee = float(participation_data['consultation_fee'])
            if fee < 0:
                return {
                    'valid': False,
                    'message': 'Consultation fee cannot be negative'
                }
            
            if fee > 10000:  # Reasonable upper limit
                return {
                    'valid': False,
                    'message': 'Consultation fee cannot exceed 10,000'
                }
            
            # If participation type is volunteer, fee must be 0
            if ('participation_type' in participation_data and 
                participation_data['participation_type'] == 'volunteer' and fee > 0):
                return {
                    'valid': False,
                    'message': 'Volunteer doctors cannot charge fees. Fee must be 0 for volunteer participation.'
                }
            
            # If participation type is paid, fee should be > 0
            if ('participation_type' in participation_data and 
                participation_data['participation_type'] == 'paid' and fee == 0):
                return {
                    'valid': False,
                    'message': 'Paid doctors must set a consultation fee greater than 0'
                }
                
        except (ValueError, TypeError):
            return {
                'valid': False,
                'message': 'Consultation fee must be a valid number'
            }
    
    return {
        'valid': True,
        'message': 'Participation data is valid'
    }

def validate_participation_type(participation_type: str) -> Dict[str, Union[bool, str]]:
    """
    Validate doctor participation type
    
    Args:
        participation_type: Participation type to validate
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    valid_types = ['volunteer', 'paid']
    
    if not participation_type or not isinstance(participation_type, str):
        return {
            'valid': False,
            'message': 'Participation type is required'
        }
    
    if participation_type.lower() not in valid_types:
        return {
            'valid': False,
            'message': f'Invalid participation type. Must be one of: {", ".join(valid_types)}'
        }
    
    return {
        'valid': True,
        'message': 'Participation type is valid'
    }

def validate_consultation_fee(fee: Union[str, float, int], participation_type: str = None) -> Dict[str, Union[bool, str]]:
    """
    Validate consultation fee based on participation type
    
    Args:
        fee: Fee to validate
        participation_type: Doctor's participation type for context validation
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    try:
        fee_float = float(fee) if fee is not None else 0.0
    except (ValueError, TypeError):
        return {
            'valid': False,
            'message': 'Consultation fee must be a valid number'
        }
    
    if fee_float < 0:
        return {
            'valid': False,
            'message': 'Consultation fee cannot be negative'
        }
    
    if fee_float > 10000:
        return {
            'valid': False,
            'message': 'Consultation fee cannot exceed 10,000'
        }
    
    # Context-specific validation
    if participation_type:
        if participation_type == 'volunteer' and fee_float > 0:
            return {
                'valid': False,
                'message': 'Volunteer doctors cannot charge fees'
            }
        elif participation_type == 'paid' and fee_float == 0:
            return {
                'valid': False,
                'message': 'Paid doctors must set a consultation fee greater than 0'
            }
    
    return {
        'valid': True,
        'message': 'Consultation fee is valid'
    }

def validate_vital_signs_ranges(vital_signs_data: dict) -> Dict[str, Union[bool, str]]:
    """
    Validate vital signs values are within normal ranges
    
    Args:
        vital_signs_data: Dictionary containing vital signs values
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    # Define normal ranges for vital signs
    ranges = {
        'systolic_bp': {'min': 60, 'max': 250, 'name': 'Systolic blood pressure'},
        'diastolic_bp': {'min': 40, 'max': 150, 'name': 'Diastolic blood pressure'},
        'heart_rate': {'min': 30, 'max': 200, 'name': 'Heart rate'},
        'temperature': {'min': 32.0, 'max': 45.0, 'name': 'Temperature'},
        'respiratory_rate': {'min': 8, 'max': 40, 'name': 'Respiratory rate'},
        'oxygen_saturation': {'min': 70.0, 'max': 100.0, 'name': 'Oxygen saturation'},
        'height': {'min': 30.0, 'max': 300.0, 'name': 'Height'},
        'weight': {'min': 1.0, 'max': 1000.0, 'name': 'Weight'},
        'pain_scale': {'min': 0, 'max': 10, 'name': 'Pain scale'}
    }
    
    for field, range_info in ranges.items():
        if field in vital_signs_data and vital_signs_data[field] is not None and vital_signs_data[field] != '':
            try:
                value = float(vital_signs_data[field])
                if value < range_info['min'] or value > range_info['max']:
                    return {
                        'valid': False,
                        'message': f"{range_info['name']} must be between {range_info['min']} and {range_info['max']}"
                    }
            except (ValueError, TypeError):
                return {
                    'valid': False,
                    'message': f"{range_info['name']} must be a valid number"
                }
    
    # Additional validation for blood pressure relationship
    if ('systolic_bp' in vital_signs_data and 'diastolic_bp' in vital_signs_data and 
        vital_signs_data['systolic_bp'] is not None and vital_signs_data['diastolic_bp'] is not None):
        try:
            systolic = float(vital_signs_data['systolic_bp'])
            diastolic = float(vital_signs_data['diastolic_bp'])
            if diastolic >= systolic:
                return {
                    'valid': False,
                    'message': 'Systolic blood pressure must be higher than diastolic pressure'
                }
        except (ValueError, TypeError):
            pass  # Already handled above
    
    return {
        'valid': True,
        'message': 'Vital signs are within valid ranges'
    }

def validate_text_field_length(text: str, field_name: str, max_length: int, min_length: int = 0) -> Dict[str, Union[bool, str]]:
    """
    Validate text field length with security considerations
    
    Args:
        text: Text to validate
        field_name: Name of the field for error messages
        max_length: Maximum allowed length
        min_length: Minimum required length (default: 0)
        
    Returns:
        dict: Contains 'valid' (bool) and 'message' (str)
    """
    if text is None:
        if min_length > 0:
            return {
                'valid': False,
                'message': f'{field_name} is required'
            }
        return {
            'valid': True,
            'message': f'{field_name} is valid'
        }
    
    if not isinstance(text, str):
        return {
            'valid': False,
            'message': f'{field_name} must be text'
        }
    
    text_length = len(text.strip())
    
    if text_length < min_length:
        return {
            'valid': False,
            'message': f'{field_name} must be at least {min_length} characters long'
        }
    
    if text_length > max_length:
        return {
            'valid': False,
            'message': f'{field_name} must be less than {max_length} characters (current: {text_length})'
        }
    
    # Check for suspicious patterns that might indicate abuse
    # Multiple consecutive spaces, excessive newlines, or repeated characters
    cleaned_text = text.strip()
    if '  ' * 10 in cleaned_text:  # 20+ consecutive spaces
        return {
            'valid': False,
            'message': f'{field_name} contains excessive whitespace'
        }
    
    if '\n' * 10 in cleaned_text:  # 10+ consecutive newlines
        return {
            'valid': False,
            'message': f'{field_name} contains excessive line breaks'
        }
    
    # Check for repeated character patterns (possible spam)
    for char in 'abcdefghijklmnopqrstuvwxyz0123456789':
        if char * 20 in cleaned_text.lower():  # 20+ repeated characters
            return {
                'valid': False,
                'message': f'{field_name} contains suspicious repeated characters'
            }
    
    return {
        'valid': True,
        'message': f'{field_name} is valid'
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


# ============================================================================
# STANDARDIZED VALIDATION FUNCTIONS
# ============================================================================

def validate_pagination_params(page: int = 1, per_page: int = None) -> Dict[str, Union[bool, str, int]]:
    """
    Validate pagination parameters with configurable limits
    
    Args:
        page: Page number (1-based)
        per_page: Items per page
        
    Returns:
        dict: Contains validation result and validated values
    """
    from flask import current_app
    
    # Get configurable limits
    default_per_page = getattr(current_app.config, 'POSTS_PER_PAGE', 20)
    max_per_page = getattr(current_app.config, 'MAX_PAGE_SIZE', 100)
    
    # Validate page number
    if not isinstance(page, int) or page < 1:
        return {
            'valid': False,
            'message': 'Page number must be a positive integer'
        }
    
    # Set default per_page if not provided
    if per_page is None:
        per_page = default_per_page
    
    # Validate per_page
    if not isinstance(per_page, int) or per_page < 1:
        return {
            'valid': False,
            'message': 'Items per page must be a positive integer'
        }
    
    if per_page > max_per_page:
        return {
            'valid': False,
            'message': f'Items per page cannot exceed {max_per_page}'
        }
    
    return {
        'valid': True,
        'message': 'Pagination parameters are valid',
        'page': page,
        'per_page': per_page
    }


def validate_json_payload(data: dict, required_fields: list = None, optional_fields: list = None) -> Dict[str, Union[bool, str]]:
    """
    Validate JSON payload structure and required fields
    
    Args:
        data: JSON data to validate
        required_fields: List of required field names
        optional_fields: List of optional field names
        
    Returns:
        dict: Contains validation result
    """
    if not isinstance(data, dict):
        return {
            'valid': False,
            'message': 'Invalid JSON payload'
        }
    
    if not data:
        return {
            'valid': False,
            'message': 'Empty payload'
        }
    
    # Check required fields
    if required_fields:
        missing_fields = []
        for field in required_fields:
            if field not in data or data.get(field) is None or (isinstance(data.get(field), str) and not data.get(field).strip()):
                missing_fields.append(field)
        
        if missing_fields:
            return {
                'valid': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}',
                'missing_fields': missing_fields
            }
    
    # Check for unexpected fields if optional_fields is specified
    if optional_fields is not None:
        allowed_fields = set((required_fields or []) + optional_fields)
        unexpected_fields = set(data.keys()) - allowed_fields
        if unexpected_fields:
            return {
                'valid': False,
                'message': f'Unexpected fields: {", ".join(unexpected_fields)}',
                'unexpected_fields': list(unexpected_fields)
            }
    
    return {
        'valid': True,
        'message': 'Payload is valid'
    }


def validate_id_parameter(id_value: Union[str, int], param_name: str = 'id') -> Dict[str, Union[bool, str, int]]:
    """
    Validate ID parameter (must be positive integer)
    
    Args:
        id_value: ID value to validate
        param_name: Name of the parameter for error messages
        
    Returns:
        dict: Contains validation result and validated ID
    """
    try:
        id_int = int(id_value)
        if id_int <= 0:
            return {
                'valid': False,
                'message': f'{param_name} must be a positive integer'
            }
        
        return {
            'valid': True,
            'message': f'{param_name} is valid',
            'id': id_int
        }
    except (ValueError, TypeError):
        return {
            'valid': False,
            'message': f'{param_name} must be a valid integer'
        }


def validate_enum_field(value: str, allowed_values: list, field_name: str) -> Dict[str, Union[bool, str]]:
    """
    Validate enum/choice field against allowed values
    
    Args:
        value: Value to validate
        allowed_values: List of allowed values
        field_name: Name of the field for error messages
        
    Returns:
        dict: Contains validation result
    """
    if not value:
        return {
            'valid': False,
            'message': f'{field_name} is required'
        }
    
    if value not in allowed_values:
        return {
            'valid': False,
            'message': f'{field_name} must be one of: {", ".join(allowed_values)}'
        }
    
    return {
        'valid': True,
        'message': f'{field_name} is valid'
    }


def validate_date_range(start_date: str, end_date: str) -> Dict[str, Union[bool, str]]:
    """
    Validate date range (start_date must be before end_date)
    
    Args:
        start_date: Start date in ISO format
        end_date: End date in ISO format
        
    Returns:
        dict: Contains validation result
    """
    from datetime import datetime
    
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if start >= end:
            return {
                'valid': False,
                'message': 'Start date must be before end date'
            }
        
        return {
            'valid': True,
            'message': 'Date range is valid'
        }
    except ValueError as e:
        return {
            'valid': False,
            'message': f'Invalid date format: {str(e)}'
        }


# ============================================================================
# STANDARDIZED ERROR HANDLING DECORATOR
# ============================================================================

from functools import wraps
from flask import request
from utils.responses import APIResponse
from utils.logging_config import app_logger

def handle_api_errors(f):
    """
    Decorator to provide standardized error handling for API endpoints
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            app_logger.warning(f"Validation error in {f.__name__}: {str(e)}")
            return APIResponse.validation_error(message=str(e))
        except KeyError as e:
            app_logger.warning(f"Missing required field in {f.__name__}: {str(e)}")
            return APIResponse.validation_error(message=f'Missing required field: {str(e)}')
        except Exception as e:
            app_logger.error(f"Unexpected error in {f.__name__}: {str(e)}")
            return APIResponse.internal_error(message='An unexpected error occurred')
    
    return decorated_function


def validate_request_data(required_fields: list = None, optional_fields: list = None):
    """
    Decorator to validate request JSON data
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            
            # Validate payload structure
            validation = validate_json_payload(data, required_fields, optional_fields)
            if not validation['valid']:
                return APIResponse.validation_error(
                    message=validation['message'],
                    field=validation.get('missing_fields', validation.get('unexpected_fields'))
                )
            
            # Add validated data to kwargs
            kwargs['validated_data'] = data
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator