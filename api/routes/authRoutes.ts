import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import userDao from '../dao/UserDao';

const router = Router();



/**
 * @route   GET /api/users/:uid
 * @desc    Get user by UID
 * @access  Private (requires authentication)
 */
router.get('/:uid', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const user = await userDao.findById(uid);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/user/signup
 * @desc    Create a new user
 * @param   {string} email - The email of the user
 * @param   {string} password - The password of the user
 * @param   {string} displayName - The display name of the user
 * @access  Public
 */
router.post('/signup', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.uid || '';
    const { email, firstName, lastName, age } = req.body;

    if (!email || !firstName || !lastName || !age) {
      res.status(400).json({
        success: false,
        message: 'Email, password, firstName, lastName, and age are required. please check the request body',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await userDao.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Email already exists',
      });
      return;
    }

    const user = await userDao.create({
      uid: uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      age: age,
      emailVerified: false,
      disabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({
        success: false,
        message: 'Email already exists',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message,
      });
    }
  }
});

/**
 * @route   PUT /api/users/:uid
 * @desc    Update user by UID
 * @access  Private (requires authentication)
 */
router.put('/:uid', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { email, firstName, lastName, displayName, age, disabled, emailVerified } = req.body;

    const updateData: any = {};
    if (email) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (age !== undefined) updateData.age = age;
    if (disabled !== undefined) updateData.disabled = disabled;
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified;

    const user = await userDao.update(uid, updateData);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.message === 'User not found') {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message,
      });
    }
  }
});

/**
 * @route   DELETE /api/users/:uid
 * @desc    Delete user by UID
 * @access  Private (requires authentication)
 */
router.delete('/:uid', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    await userDao.delete(uid);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error.message === 'User not found') {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message,
      });
    }
  }
});

export default router;

