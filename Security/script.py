import requests
import pyotp

# Define your username and password
USERNAME = 'your_username'
PASSWORD = 'your_password'

# URL of the login page
login_url = 'https://www.example.com/login'

# Generate a secret key for MFA
secret_key = pyotp.random_base32()

# Create a TOTP object for MFA
totp = pyotp.TOTP(secret_key)

# Initialize a session
session = requests.Session()

# This is the form data that the page sends when logging in
login_data = {
    'username': USERNAME,
    'password': PASSWORD,
    'otp': totp.now(),  # Add the OTP to the form data
}

# Authenticate
r = session.post(login_url, data=login_data)

# Check if login was successful
if r.status_code == 200:
    print("Successfully logged in.")
else:
    print("Failed to log in.")
