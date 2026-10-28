import { randomUUID } from 'crypto';
import {
  Requirement,
  RequirementStatus,
  Program,
  TermCalendar,
  CreateRequirementDto,
  UpdateDraftRequirementDto,
  UserContext,
} from './requirement.types';
type AuditLogPayload = any;
const auditLogService = { logAction: async (_payload: AuditLogPayload) => {} };

export class RequirementForbiddenError extends Error {
  public readonly statusCode = 403;
  constructor(message: string = 'Access denied: Faculty Staff cannot create or edit requirements; attempts return 403.') {
    super(message);
    this.name = 'RequirementForbiddenError';
  }
}

export class RequirementValidationError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'RequirementValidationError';
  }
}

export class RequirementNotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(message: string = 'Requirement not found.') {
    super(message);
    this.name = 'RequirementNotFoundError';
  }
}

export class RequirementService {
  private static instance: RequirementService;

  // Pre-seeded standard programs (PUPQC Campus)
  private readonly programs: Program[] = [
    { id: 'prog-bsit-01', code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
    { id: 'prog-bsba-02', code: 'BSBA-HRM', name: 'Bachelor of Science in Business Administration Major in HRM' },
    { id: 'prog-bsba-03', code: 'BSBA-MM', name: 'Bachelor of Science in Business Administration Major in MM' },
    { id: 'prog-domt-04', code: 'DOMT', name: 'Diploma in Office Management Technology' },
    { id: 'prog-entrep-05', code: 'BSENTREP', name: 'Bachelor of Science in Entrepreneurship' },
  ];

  // Pre-seeded official term calendars
  private readonly termCalendars: TermCalendar[] = [
    {
      id: 'term-2026-1st',
      academicYear: 'A.Y. 2026-2027',
      semester: '1st Semester',
      startDate: '2026-09-01',
      endDate: '2027-01-31',
      isActive: true,
    },
    {
      id: 'term-2026-2nd',
      academicYear: 'A.Y. 2026-2027',
      semester: '2nd Semester',
      startDate: '2027-02-15',
      endDate: '2027-06-30',
      isActive: false,
    },
  ];

  private readonly requirements: Map<string, Requirement> = new Map();

  private constructor() {
    this.seedDefaultRequirements();
  }

  public static getInstance(): RequirementService {
    if (!RequirementService.instance) {
      RequirementService.instance = new RequirementService();
    }
    return RequirementService.instance;
  }

  private seedDefaultRequirements() {
    // Seed an initial published requirement for BSIT
    const defaultReq: Requirement = {
      id: 'req-bsit-syllabus-2026',
      programId: 'prog-bsit-01',
      programCode: 'BSIT',
      programName: 'Bachelor of Science in Information Technology',
      termCalendarId: 'term-2026-1st',
      termName: 'A.Y. 2026-2027 1st Semester',
      requirementType: 'Syllabus',
      name: 'OBE Course Syllabus Submission',
      description: 'Submission of OBE-aligned course syllabus with program outcomes and assessment rubrics.',
      deadlineAt: '2026-10-31T23:59:59Z',
      status: 'PUBLISHED',
      createdBy: 'user-academic-head',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    };
    this.requirements.set(defaultReq.id, defaultReq);
  }

  public getPrograms(): Program[] {
    return [...this.programs];
  }

  public getTermCalendars(): TermCalendar[] {
    return [...this.termCalendars];
  }

  /**
   * SCMS-004 Task 1 & AC 1: Create requirement per program and term
   * SCMS-004 Task 3 & AC 3: Restrict creating to Academic Head (Faculty Staff returns 403)
   */
  public createRequirement(actor: UserContext, dto: CreateRequirementDto): Requirement {
    if (actor.role !== 'ACADEMIC_HEAD') {
      throw new RequirementForbiddenError('Faculty Staff cannot create or edit requirements; attempts return 403.');
    }

    if (!dto.name || !dto.name.trim()) {
      throw new RequirementValidationError('Requirement name is required.');
    }
    if (!dto.description || !dto.description.trim()) {
      throw new RequirementValidationError('Requirement description is required.');
    }

    const program = this.programs.find(p => p.id === dto.programId || p.code === dto.programId);
    if (!program) {
      throw new RequirementValidationError(`Invalid program: ${dto.programId}`);
    }

    const term = this.termCalendars.find(t => t.id === dto.termCalendarId);
    if (!term) {
      throw new RequirementValidationError(`Invalid term calendar: ${dto.termCalendarId}`);
    }

    const requirementId = randomUUID();
    const newRequirement: Requirement = {
      id: requirementId,
      programId: program.id,
      programCode: program.code,
      programName: program.name,
      termCalendarId: term.id,
      termName: `${term.academicYear} ${term.semester}`,
      requirementType: dto.requirementType || 'Syllabus',
      name: dto.name.trim(),
      description: dto.description.trim(),
      deadlineAt: dto.deadlineAt || null,
      status: 'DRAFT',
      createdBy: actor.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.requirements.set(requirementId, newRequirement);

    // Audit Log recording (SCMS-014 AC 1 & AC 3)
    auditLogService.logAction({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'REQUIREMENT_CREATED',
      entityName: 'REQUIREMENT',
      entityId: requirementId,
      previousValue: null,
      newValue: {
        name: newRequirement.name,
        programCode: newRequirement.programCode,
        termName: newRequirement.termName,
        status: newRequirement.status,
      },
      details: { programName: newRequirement.programName },
      clientIp: actor.ip,
    });

    return newRequirement;
  }

  /**
   * SCMS-004 Task 2 & AC 2: Allow draft requirements to be edited before they are published
   * SCMS-004 Task 3 & AC 3: Restrict editing to Academic Head (Faculty Staff returns 403)
   * SCMS-005 Task 3 & AC 3: If deadline changed, record previous and new value in audit log
   */
  public updateDraftRequirement(
    actor: UserContext,
    requirementId: string,
    dto: UpdateDraftRequirementDto
  ): Requirement {
    if (actor.role !== 'ACADEMIC_HEAD') {
      throw new RequirementForbiddenError('Faculty Staff cannot create or edit requirements; attempts return 403.');
    }

    const existing = this.requirements.get(requirementId);
    if (!existing) {
      throw new RequirementNotFoundError(`Requirement ${requirementId} not found.`);
    }

    if (existing.status !== 'DRAFT') {
      throw new RequirementValidationError(`Cannot edit requirement with status ${existing.status}. Only DRAFT requirements can be edited.`);
    }

    const previousValue = {
      name: existing.name,
      description: existing.description,
      deadlineAt: existing.deadlineAt,
    };

    const isDeadlineChanged = dto.deadlineAt !== undefined && dto.deadlineAt !== existing.deadlineAt;
    const oldDeadline = existing.deadlineAt;

    if (dto.name !== undefined) existing.name = dto.name.trim();
    if (dto.description !== undefined) existing.description = dto.description.trim();
    if (dto.deadlineAt !== undefined) existing.deadlineAt = dto.deadlineAt;
    if (dto.requirementType !== undefined) existing.requirementType = dto.requirementType;
    existing.updatedAt = new Date().toISOString();

    const newValue = {
      name: existing.name,
      description: existing.description,
      deadlineAt: existing.deadlineAt,
    };

    this.requirements.set(requirementId, existing);

    // Record general requirement update
    auditLogService.logAction({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'REQUIREMENT_UPDATED',
      entityName: 'REQUIREMENT',
      entityId: requirementId,
      previousValue,
      newValue,
      details: { status: existing.status },
      clientIp: actor.ip,
    });

    // SCMS-005 Task 3 & AC 3: Record deadline change in audit trail
    if (isDeadlineChanged) {
      auditLogService.logAction({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        actionType: 'DEADLINE_CHANGED',
        entityName: 'REQUIREMENT',
        entityId: requirementId,
        previousValue: { deadlineAt: oldDeadline },
        newValue: { deadlineAt: existing.deadlineAt },
        details: { requirementName: existing.name, programCode: existing.programCode },
        clientIp: actor.ip,
      });
    }

    return existing;
  }

  /**
   * SCMS-005 Task 1 & AC 1: Require deadline before publishing
   * SCMS-005 Task 2 & AC 2: Add Publish action (DRAFT -> PUBLISHED)
   */
  public publishRequirement(actor: UserContext, requirementId: string, deadlineAt?: string): Requirement {
    if (actor.role !== 'ACADEMIC_HEAD') {
      throw new RequirementForbiddenError('Faculty Staff cannot publish requirements; attempts return 403.');
    }

    const existing = this.requirements.get(requirementId);
    if (!existing) {
      throw new RequirementNotFoundError(`Requirement ${requirementId} not found.`);
    }

    if (deadlineAt) {
      existing.deadlineAt = deadlineAt;
    }

    // AC 1: A requirement cannot be published without a deadline for the term
    if (!existing.deadlineAt || !existing.deadlineAt.trim()) {
      throw new RequirementValidationError('A requirement cannot be published without a deadline for the term.');
    }

    const previousStatus = existing.status;
    existing.status = 'PUBLISHED';
    existing.updatedAt = new Date().toISOString();
    this.requirements.set(requirementId, existing);

    auditLogService.logAction({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'REQUIREMENT_PUBLISHED',
      entityName: 'REQUIREMENT',
      entityId: requirementId,
      previousValue: { status: previousStatus },
      newValue: { status: 'PUBLISHED', deadlineAt: existing.deadlineAt },
      details: { requirementName: existing.name },
      clientIp: actor.ip,
    });

    return existing;
  }

  /**
   * SCMS-005 Task 2 & AC 2: Add Close action (PUBLISHED -> CLOSED)
   */
  public closeRequirement(actor: UserContext, requirementId: string): Requirement {
    if (actor.role !== 'ACADEMIC_HEAD') {
      throw new RequirementForbiddenError('Faculty Staff cannot close requirements; attempts return 403.');
    }

    const existing = this.requirements.get(requirementId);
    if (!existing) {
      throw new RequirementNotFoundError(`Requirement ${requirementId} not found.`);
    }

    const previousStatus = existing.status;
    existing.status = 'CLOSED';
    existing.updatedAt = new Date().toISOString();
    this.requirements.set(requirementId, existing);

    auditLogService.logAction({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'REQUIREMENT_CLOSED',
      entityName: 'REQUIREMENT',
      entityId: requirementId,
      previousValue: { status: previousStatus },
      newValue: { status: 'CLOSED' },
      details: { requirementName: existing.name },
      clientIp: actor.ip,
    });

    return existing;
  }

  /**
   * SCMS-005 Task 3 & AC 3: Explicit deadline change
   */
  public changeDeadline(actor: UserContext, requirementId: string, newDeadlineAt: string): Requirement {
    if (actor.role !== 'ACADEMIC_HEAD') {
      throw new RequirementForbiddenError('Faculty Staff cannot change deadlines; attempts return 403.');
    }

    if (!newDeadlineAt || !newDeadlineAt.trim()) {
      throw new RequirementValidationError('New deadline cannot be empty.');
    }

    const existing = this.requirements.get(requirementId);
    if (!existing) {
      throw new RequirementNotFoundError(`Requirement ${requirementId} not found.`);
    }

    const oldDeadline = existing.deadlineAt;
    existing.deadlineAt = newDeadlineAt.trim();
    existing.updatedAt = new Date().toISOString();
    this.requirements.set(requirementId, existing);

    // Record deadline change in audit trail (SCMS-005 AC 3)
    auditLogService.logAction({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'DEADLINE_CHANGED',
      entityName: 'REQUIREMENT',
      entityId: requirementId,
      previousValue: { deadlineAt: oldDeadline },
      newValue: { deadlineAt: existing.deadlineAt },
      details: { requirementName: existing.name, programCode: existing.programCode },
      clientIp: actor.ip,
    });

    return existing;
  }

  /**
   * SCMS-005 Task 2 & AC 2: Role-scoped read visibility:
   * - Faculty Staff: Draft requirements are hidden! Published are visible, Closed are marked closed.
   * - Academic Head: Sees all requirements (DRAFT, PUBLISHED, CLOSED).
   */
  public getRequirements(actor: UserContext): Requirement[] {
    const all = Array.from(this.requirements.values());

    if (actor.role === 'FACULTY_STAFF') {
      // Draft requirements are hidden from Faculty Staff
      return all.filter(r => r.status !== 'DRAFT');
    }

    // Academic Head sees everything
    return all;
  }

  public getRequirementById(actor: UserContext, requirementId: string): Requirement | undefined {
    const req = this.requirements.get(requirementId);
    if (!req) return undefined;

    if (actor.role === 'FACULTY_STAFF' && req.status === 'DRAFT') {
      // Concealed from Faculty Staff
      return undefined;
    }

    return req;
  }

  public resetForTesting(): void {
    this.requirements.clear();
    this.seedDefaultRequirements();
  }
}

export const requirementService = RequirementService.getInstance();



