import { DateTime } from 'luxon';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationItem } from '../kit-ead-portal';

@Entity()
export class NotificationEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  public id = 0;

  @Column('date')
  public publishedAt = '0000-00-00';

  @Column('varchar', { length: 32 })
  public source = '';

  @Column('varchar', { length: 32 })
  public category = '';

  @Column('text')
  public title = '';

  @Column('text')
  public description = '';

  @Column('text', { nullable: true })
  public url: string | null = '';

  @CreateDateColumn()
  public firstSeen: Date | null = null;

  public static createFromResponse(item: NotificationItem): NotificationEntity {
    const parsedDate = DateTime.fromString(item.date, 'yyyy.M.d');
    if (!parsedDate.isValid) throw new Error('invalid date');

    return NotificationEntity.create({
      publishedAt: parsedDate.toFormat('yyyy-MM-dd'),
      source: item.source,
      category: item.category,
      title: item.title,
      description: item.description || '',
      url: item.url || null,
      firstSeen: new Date(),
    });
  }

  public static findSameEntity(item: NotificationItem) {
    const parsedDate = DateTime.fromString(item.date, 'yyyy.M.d');
    if (!parsedDate.isValid) throw new Error('invalid date');

    return NotificationEntity.findOne({
      where: {
        publishedAt: parsedDate.toFormat('yyyy-MM-dd'),
        source: item.source,
        category: item.category,
        title: item.title,
        description: item.description || '',
        url: item.url || null,
      },
    });
  }
}
