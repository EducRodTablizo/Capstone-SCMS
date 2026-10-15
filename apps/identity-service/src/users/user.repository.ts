import { User, UserRole } from './user.entity';
import { hashPassword } from '../auth/password.util';

class UserRepository {
  private users: Map<string, User> = new Map();
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

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

    for (const u of seedUsers) {
      this.users.set(u.email.toLowerCase(), u);
    }

    this.isInitialized = true;
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.init();
    const user = this.users.get(email.toLowerCase().trim());
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    await this.init();
    for (const user of this.users.values()) {
      if (user.id === id) return user;
    }
    return null;
  }

  async getAllUsers(): Promise<User[]> {
    await this.init();
    return Array.from(this.users.values());
  }
}

export const userRepository = new UserRepository();
