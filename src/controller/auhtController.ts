import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { loginSchema, registerSchema } from "../schema/userSchema";

export const register = async (req: Request, res: Response): Promise<void> => {

  const validationResult = registerSchema.safeParse(req.body);

  if(!validationResult.success){
    res.status(400).json({errors: validationResult.error.errors});
    return;
  }
  const { name, email, password, role } = validationResult.data;

  try {
    const exsitingUser = await User.findOne({ email });
    if (exsitingUser) {
      res.status(400).json({ message: "User already exists!" });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();


    const { password: _, ...userWithoutPassword } = user.toObject();


    res.status(201).json({
      message: "Admin registered successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ message: "Error registering user!", error });
  }
};
export const update_user = async(req:Request, res:Response) =>{
  const userId = req.params.id;
  const { name, email, password } = req.body;
  console.table({ name, email, password });
  
  try{
    if(!userId){
      res.status(400).json({message:"User id Required"});
      return;
    }

    const updatedRecord : Record<string, any> = {};

    if(name) updatedRecord.name = name;
    if(email) updatedRecord.email = email;

    if(password){
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedRecord.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatedRecord,  { new: true, runValidators: true });

    console.table({updatedUser});

    if(!updatedUser){
      res.status(404).json({message:"User not found"});
      return;
    }


    const { password: _, ...userWithoutPassword } = updatedUser.toObject();


    res.status(201).json({
      message: "Admin Updated successfully",
      user: userWithoutPassword,
    });
  }
  catch(error){
    res.status(500).json({message:"Error updating user!", error})
  }
}


export const deleteUser = async(req:Request, res:Response) =>{
  const userId = req.params.id;

try{
  if(!userId){
    res.status(400).json({message:"User Id required"});
    return;
  }

  const deleteUser = await User.findByIdAndDelete(userId);

  if(!deleteUser){
    res.status(404).json({message:"user not found!"});
    return;
  }

  res.status(200).json({message:"Admin Deleted Successfully"});
}catch(error){
  res.status(500).json({message:"Error deleting user!", error});
}
}


export const loginuser = async (req: Request, res: Response) => {

  const validationResult = loginSchema.safeParse(req.body);
  if(!validationResult.success){
    res.status(400).json({errors: validationResult.error.errors});
    return;
  } 

  const { email, password } = validationResult.data;

  try {
    const user: IUser | null = await User.findOne({ email });

    console.log("User ----> ", user);

    // if(!user.status){
    //   res.status(403).json({message:"Your account is disable from admin!!"});
    // }


    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    else if(!user.status){
      res.status(403).json({message:"You account is disable from the admin side!"});
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const secret = process.env.JWT_SECRET || "srtaxi";
    // const token = jwt.sign({ id: user._id, role: user.role }, secret, {
    //   expiresIn: "1h",
    // });
    const token = jwt.sign({ id: user._id, role: user.role }, secret);
    console.log("token ----> ", token)
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};
export const loginadmin = async (req: Request, res: Response) => {

  const validationResult = loginSchema.safeParse(req.body);
  if(!validationResult.success){
    res.status(400).json({errors: validationResult.error.errors});
    return;
  }

  const { email, password } = validationResult.data;

  try {
    const user: IUser | null = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const secret = process.env.JWT_SECRET || "srtaxi";
    // const token = jwt.sign({ id: user._id, role: user.role }, secret, {
    //   expiresIn: "1h",
    // });
    const token = jwt.sign({ id: user._id, role: user.role }, secret);
    console.log("token ----> ", token)
    res.status(200).json({ message: "Login successful", token, role: user.role  });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};
