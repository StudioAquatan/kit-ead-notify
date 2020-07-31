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

  @Column('varchar', { length: 16 })
  public faculty = '';

  @Column('varchar', { length: 8 })
  public semester = '';

  @Column('varchar', { length: 128, nullable: true })
  public subject: string | null = '';

  @Column('varchar', { length: 128, nullable: true })
  public teacher: string | null = '';

  @Column('varchar', { length: 8, nullable: true })
  public day: string | null = '';

  @Column('varchar', { length: 8, nullable: true })
  public hour: string | null = '';

  @Column('varchar', { length: 16 })
  public category = '';

  @Column('text')
  public content = '';

  @Column('date')
  public createdAt = new Date();

  @Column('date')
  public updatedAt = new Date();

  @CreateDateColumn()
  public firstSeen: Date | null = null;

  public static createFromResponse(
    item: LectureInformation,
  ): LectureInfoEntity {
    const parsedCreatedDate = new Date(item.createdAt);
    const parsedUpdatedDate = new Date(item.updatedAt);

    return LectureInfoEntity.create({
      ...item,
      createdAt: parsedCreatedDate,
      updatedAt: parsedUpdatedDate,
      firstSeen: new Date(),
    });
  }

  public static findSameEntity(item: LectureInformation) {
    const parsedCreatedDate = new Date(item.createdAt);

    return LectureInfoEntity.findOne({
      where: {
        faculty: item.faculty,
        semester: item.semester,
        subject: item.subject,
        teacher: item.teacher,
        day: item.day,
        hour: item.hour,
        category: item.category,
        createdAt: parsedCreatedDate,
      },
    });
  }

  public merge(item: LectureInformation) {
    const parsedUpdatedDate = new Date(item.updatedAt);

    let modified = false;
    if (parsedUpdatedDate.getTime() !== this.updatedAt.getTime()) {
      this.updatedAt = parsedUpdatedDate;
      modified = true;
    }

    if (this.content !== item.content) {
      this.content = item.content;
      modified = true;
    }

    return modified;
  }
}
