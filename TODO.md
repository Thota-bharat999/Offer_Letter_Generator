# TODO: Update /offer/reset-password endpoint

- [x] Update forgotPassword function to hash the OTP before storing in admin.resetOtp
- [x] Update resetPasswordWithOtp function to accept email in request payload
- [x] Add email validation in resetPasswordWithOtp
- [x] Modify OTP validation logic to find admin by email and check hashed OTP against resetOtp and expiration against resetOtpExpires
