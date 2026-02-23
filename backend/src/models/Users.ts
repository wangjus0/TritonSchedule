import mongoose from 'mongoose';


export type User = {
  name: string,
  password: string,
}

export const UserSchema: mongoose.Schema<User> = new mongoose.Schema({
  name: { type: String, unique: true },
  password: { type: String },
})

export const UserModel = mongoose.model<User>('users', UserSchema);
