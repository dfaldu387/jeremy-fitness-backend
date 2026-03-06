const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Referral, User, PrivacyPolicy } = require('../models/associations');
const generateToken = require('../functions/index');
const postmark = require('postmark');
const ProfileSetting = require('../models/profileSetting.model');
const clientEmail = new postmark.ServerClient(process.env.POSTMARK_SMTP_USER);
const { responseSuccess, responseError } = require('../utils/response');
const path = require('path');
const fs = require('fs');

exports.authMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) return responseError(res, 404, 'User not found');

    return responseSuccess(res, 200, 'User fetched successfully', { user });
  } catch (error) {
    return responseError(res, 500, 'Something went wrong', error.message);
  }
};

exports.signup = async (req, res) => {
  try {
    const { email, password, name, referralCode } = req.body;

    if (!email || !password || !name) {
      return responseError(res, 400, 'Name, Email and Password are required');
    }

    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ where: { referralCode } });
      if (!referrer) return responseError(res, 400, 'Invalid referral code');
    }

    let existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.is_verified) {
        return responseError(res, 400, 'Email already registered. Please login or use another email.');
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUser.name = name;
        existingUser.password = hashedPassword;
        existingUser.is_verified = false;
        existingUser.referralCode = referralCode || existingUser.referralCode;
        await existingUser.save();
        return responseSuccess(res, 200, 'Your account exists but not verified', { user: existingUser });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const newUser = await User.create({
      userId,
      email,
      password: hashedPassword,
      name,
      level: 1,
      points: 0,
      referralCode: null,
    });

    await ProfileSetting.create({ userId: newUser.id });

    if (referralCode) {
      const referrer = await User.findOne({ where: { referralCode } });

      if (referrer) {
        let referral = await Referral.findOne({ where: { referrer_id: referrer.id, email: newUser.email } });

        if (!referral) {
          referral = await Referral.create({
            referrer_id: referrer.id,
            refereeId: newUser.id,
            email: newUser.email,
            name: newUser.name,
            status: 'completed',
            points: 50,
            joinedAt: new Date(),
          });
        } else {
          referral.status = 'completed';
          referral.points = 50;
          await referral.save();
        }

        referrer.points = (referrer.points || 0) + 50;
        referrer.level += 1;
        await referrer.save();
      }
    }

    return responseSuccess(res, 201, 'User created successfully', { user: newUser });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return responseError(res, 400, 'Email already registered. Please login or use another email.');
    }
    return responseError(res, 500, 'Failed to create user', err.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) return responseError(res, 404, 'User not found');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return responseError(res, 401, 'Wrong password entered');

    if (!user.is_verified) {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      await clientEmail.sendEmail({
        From: `"Sapient eleven app" <${process.env.POSTMARK_SMTP_FROM_EMAIL}>`,
        To: user.email,
        Subject: "Verify Your Account",
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #6A8E3E;">OTP Verification</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your OTP for account verification is:</p>
            <h1 style="color:#6A8E3E; letter-spacing:3px;">${otp}</h1>
            <p>Valid for <strong>10 minutes</strong>.</p>
            <p>— The Sapient eleven app Team</p>
          </div>
        `,
        MessageStream: "outbound",
      });

      return responseError(res, 403, 'Your email is not verified. OTP has been sent to your email for verification.');
    }

    const token = generateToken(user);
    return responseSuccess(res, 200, 'Login successful', { user, token });

  } catch (err) {
    return responseError(res, 500, 'Login failed', err.message);
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const lowerCasedEmail = email.toLowerCase();

    const user = await User.findOne({ where: { email: lowerCasedEmail } });
    if (!user) return responseError(res, 404, 'User not found with this email');

    const now = Date.now();

    if (user.otp && user.otpExpiry && user.otpExpiry > now) {
      const remainingTime = Math.ceil((user.otpExpiry - now) / 1000);
      return responseError(res, 429, `OTP already sent. Please wait ${remainingTime} seconds.`, { secondsRemaining: remainingTime });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date(now + 270 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await clientEmail.sendEmail({
      From: `"Sapient Eleven App" <${process.env.POSTMARK_SMTP_FROM_EMAIL}>`,
      To: lowerCasedEmail,
      Subject: 'Your OTP Verification Code',
      HtmlBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                   <h2 style="color: #6A8E3E;">OTP Verification</h2>
                   <p>Hello <strong>${user.name}</strong>,</p>
                   <p>Your OTP is:</p>
                   <h1 style="color:#6A8E3E;">${otp}</h1>
                   <p>Valid for <strong>4 minutes 30 seconds</strong>.</p>
                   <p>— The Sapient Eleven Team</p>
                 </div>`,
      MessageStream: 'outbound',
    });

    return responseSuccess(res, 200, 'OTP sent successfully', { email: lowerCasedEmail, otpExpiry });
  } catch (error) {
    return responseError(res, 500, 'Failed to send OTP', error.message);
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) return responseError(res, 400, 'Email and OTP are required');

    const user = await User.findOne({ where: { email } });
    if (!user) return responseError(res, 404, 'User not found with this email');

    const now = Date.now();

    if (!user.otp || !user.otpExpiry || user.otpExpiry < now) {
      user.is_verified = false;
      await user.save();
      return responseError(res, 400, 'OTP has expired or not found. Please request a new one.');
    }

    if (parseInt(otp) !== parseInt(user.otp)) {
      user.is_verified = false;
      await user.save();
      return responseError(res, 400, 'The OTP you entered is incorrect');
    }

    user.otp = null;
    user.otpExpiry = null;
    user.is_verified = true;
    await user.save();

    const token = generateToken(user);
    return responseSuccess(res, 200, 'OTP verified successfully', {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to verify OTP', error.message);
  }
};

exports.addUserDataCollection = async (req, res) => {
  try {
    const {
      email,
      prefferedName,
      wellnessGoals,
      contentDeliveryPreference,
      birthdate,
      gender,
      country,
      dailyActivityLevel,
      workoutEnvironmentPreference,
      movementPreference,
      height,
      weight,
      wellnessConsiderations,
      allergiesAndSensitivities,
      nutritionStyle,
      dietaryPreference,
      sleepPreference,
      notificationPreferences,
    } = req.body;

    if (!email) return responseError(res, 400, 'Email is required');

    const user = await User.findOne({
      where: { email },
      attributes: { exclude: ['password', 'otp', 'otpExpiry', 'referralCode', 'isCryptoWallet', 'isActive', 'level', 'role'] },
    });

    if (!user) return responseError(res, 404, 'User not found with this email');

    // Transform gender value to match ENUM
    const genderMap = {
      'male': 'Male',
      'female': 'Female',
      'non-binary': 'NonBinary',
      'nonbinary': 'NonBinary',
      'prefer-not-to-say': 'PreferNotToSay',
      'prefernotosay': 'PreferNotToSay',
    };
    const transformedGender = gender ? (genderMap[gender.toLowerCase()] || gender) : gender;

    const updateData = {
      prefferedName,
      wellnessGoals,
      contentDeliveryPreference,
      birthdate,
      gender: transformedGender,
      country,
      dailyActivityLevel,
      workoutEnvironmentPreference,
      movementPreference,
      height,
      weight,
      wellnessConsiderations,
      allergiesAndSensitivities,
      nutritionStyle,
      dietaryPreference,
      sleepPreference,
      notificationPreferences,
    };
    await user.update(updateData);
    return responseSuccess(res, 200, 'Your info has been saved!', { user });
  } catch (error) {
    return responseError(res, 400, 'Failed to update user info', error.message);
  }
};

exports.updateNameOrEmail = async (req, res) => {
  try {
    const { name, email } = req.body;
    const id = req.user.id;

    if (!name && !email) return responseError(res, 400, 'Please provide at least a name or an email');

    const user = await User.findByPk(id);
    if (!user) return responseError(res, 404, 'User not found');

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) return responseError(res, 400, 'This email is already registered. Please use a different email');
    }

    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();

    return responseSuccess(res, 200, 'User updated successfully', { user });
  } catch (err) {
    return responseError(res, 500, 'Internal server error', err.message);
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword)
      return responseError(res, 400, 'Email, old password, and new password are required');

    const user = await User.findOne({ where: { email } });
    if (!user) return responseError(res, 404, 'User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return responseError(res, 400, 'The current password you entered is incorrect');

    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) return responseError(res, 400, 'New password must be different from the current password');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return responseSuccess(res, 200, 'Password updated successfully', { email });
  } catch (err) {
    return responseError(res, 500, 'Internal server error', err.message);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return responseError(res, 400, "Email is required");

    const user = await User.findOne({ where: { email } });
    if (!user) return responseError(res, 404, "No account found with this email");

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordToken = otp;
    user.resetPasswordExpires = expiry;
    user.isOtpVerifiedForReset = false;
    await user.save();

    await clientEmail.sendEmail({
      From: `"Sapient Eleven" <${process.env.POSTMARK_SMTP_FROM_EMAIL}>`,
      To: user.email,
      Subject: "Password Reset OTP",
      HtmlBody: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Password Reset</h2>
          <p>Hello ${user.name},</p>
          <p>Your OTP for password reset is:</p>
          <h1 style="color:#6A8E3E;">${otp}</h1>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
        </div>
      `,
      MessageStream: "outbound",
    });

    return responseSuccess(res, 200, "OTP sent successfully to your email", { email: user.email });
  } catch (err) {
    return responseError(res, 500, "Failed to send OTP", err.message);
  }
};

exports.verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return responseError(res, 400, "Email and OTP are required");

    const user = await User.findOne({ where: { email } });
    if (!user) return responseError(res, 404, "No user found with this email");

    if (
      user.resetPasswordToken !== otp ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return responseError(res, 400, "Invalid or expired OTP");
    }

    user.isOtpVerifiedForReset = true;
    await user.save();

    return responseSuccess(res, 200, "OTP verified successfully. You can now reset your password.", { email: user.email });
  } catch (err) {
    return responseError(res, 500, "Failed to verify OTP", err.message);
  }
};

exports.resetPasswordAfterOtp = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return responseError(res, 400, "Email and new password are required");

    const user = await User.findOne({ where: { email } });
    if (!user) return responseError(res, 404, "No user found with this email");

    if (!user.isOtpVerifiedForReset)
      return responseError(res, 403, "OTP not verified. Please verify OTP first.");

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.isOtpVerifiedForReset = false;
    await user.save();

    return responseSuccess(res, 200, "Password reset successfully", { email: user.email });
  } catch (err) {
    return responseError(res, 500, "Failed to reset password", err.message);
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return responseError(res, 400, 'No file uploaded');

    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) return responseError(res, 404, 'User not found');

    user.profilePicture = req.file.filename;
    await user.save();

    return responseSuccess(res, 200, 'Profile picture uploaded successfully', {
      filename: user.profilePicture
    });
  } catch (err) {
    return responseError(res, 500, 'Error uploading profile picture', err.message);
  }
};

exports.getProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) return responseError(res, 404, 'User not found');

    if (!user.profilePicture)
      return responseError(res, 404, 'No profile picture uploaded');

    return responseSuccess(res, 200, 'Profile picture name fetched successfully', {
      filename: user.profilePicture
    });

  } catch (err) {
    return responseError(res, 500, 'Failed to fetch profile picture', err.message);
  }
};
