import { DateTime } from 'luxon';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LectureInformation } from '../kit-ead-portal';

@Entity()
export class LectureInfoEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  public id = 0;

  @Column('varchar', { length: 32 })
  public faculty = '';

  @Column('varchar', { length: 32 })
  public semester = '';

  @Column('varchar', { length: 128, nullable: true })
  public subject: string | null = '';

  @Column('varchar', { length: 128, nullable: true })
  public teacher: string | null = '';

  @Column('varchar', { length: 32, nullable: true })
  public day: string | null = '';

  @Column('varchar', { length: 32, nullable: true })
  public hour: string | null = '';

  @Column('varchar', { length: 32 })
  public category = '';

  @Column('text')
  public content = '';

  @Column('date')
  public createdAt = '0000-00-00';

  @Column('date')
  public updatedAt = '0000-00-00';

  @CreateDateColumn()
  public firstSeen: Date | null = null;

  public static createFromResponse(
    item: LectureInformation,
  ): LectureInfoEntity {
    const parsedCreatedDate = DateTime.fromString(item.createdAt, 'yyyy/M/d');
    if (!parsedCreatedDate.isValid) throw new Error('invalid created date');

    const parsedUpdatedDate = DateTime.fromString(item.updatedAt, 'yyyy/M/d');
    if (!parsedUpdatedDate.isValid) throw new Error('invalid updated date');

    return LectureInfoEntity.create({
      ...item,
      createdAt: parsedCreatedDate.toFormat('yyyy-MM-dd'),
      updatedAt: parsedUpdatedDate.toFormat('yyyy-MM-dd'),
      firstSeen: new Date(),
    });
  }

  public static findSameEntity(item: LectureInformation) {
    const parsedCreatedDate = DateTime.fromString(item.createdAt, 'yyyy/M/d');
    if (!parsedCreatedDate.isValid) throw new Error('invalid created date');

    return LectureInfoEntity.findOne({
      where: {
        faculty: item.faculty,
        semester: item.semester,
        subject: item.subject,
        teacher: item.teacher,
        day: item.day,
        hour: item.hour,
        category: item.category,
        createdAt: parsedCreatedDate.toFormat('yyyy-MM-dd'),
        content: item.content,
      },
    });
  }
}
