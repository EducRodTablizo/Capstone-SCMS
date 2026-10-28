import { User } from './user.entity';
import { hashPassword } from '../auth/password.util';
import * as fs from 'fs';
import * as path from 'path';

class UserRepository {
  private users: User[] = [];
  private isInitialized = false;
  private readonly filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), 'users.json');
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.users, null, 2), 'utf-8');
    } catch {
      // Fallback in restricted environments
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.users = parsed.map((u: any) => ({
            ...u,
            created_at: new Date(u.created_at),
          }));
          this.isInitialized = true;
          return;
        }
      } catch {
        // Proceed to create seed users if file is corrupted or empty
      }
    }

    // SCMS Seed Accounts (Pre-hashed with Argon2id)
    const headHash = await hashPassword('AcademicHead2026!');
    const faculty1Hash = await hashPassword('Faculty2026!');
    const faculty2Hash = await hashPassword('Faculty2026!');

    const seedUsers: User[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'academic.head@pup.edu.ph',
        password_hash: headHash,
        first_name: 'Dr. Maria',
        last_name: 'Santos',
        role: 'ACADEMIC_HEAD',
        college: 'Office of Academic Affairs',
        unit: 'PUP Quezon City Campus',
        is_active: true,
        created_at: new Date('2026-01-01'),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'faculty.donayre@pup.edu.ph',
        password_hash: faculty1Hash,
        first_name: 'Prof. Juan',
        last_name: 'Donayre',
        role: 'FACULTY_STAFF',
        fms_faculty_id: 'FMS-PUPQC-0492',
        college: 'College of Computer and Information Sciences',
        unit: 'Information Technology Department',
        is_active: true,
        created_at: new Date('2026-01-15'),
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'faculty.tablizo@pup.edu.ph',
        password_hash: faculty2Hash,
        first_name: 'Prof. Rod',
        last_name: 'Tablizo',
        role: 'FACULTY_STAFF',
        fms_faculty_id: 'FMS-PUPQC-0581',
        college: 'College of Education',
        unit: 'Secondary Education Department',
        is_active: true,
        created_at: new Date('2026-01-20'),
      },
    ];

    this.users = seedUsers;
    this.saveToDisk();
    this.isInitialized = true;
  }

  async create(user: User): Promise<User> {
    await this.init();
    this.users.push(user);
    this.saveToDisk();
    return user;
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    await this.init();
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates };
    this.saveToDisk();
    return this.users[idx];
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.init();
    const normalized = email.toLowerCase().trim();
    const user = this.users.find((u) => u.email.toLowerCase() === normalized);
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    await this.init();
    return this.users.find((u) => u.id === id) || null;
  }

  async getAllUsers(): Promise<User[]> {
    await this.init();
    return [...this.users];
  }
}

export const userRepository = new UserRepository();
