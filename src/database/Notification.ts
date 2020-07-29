import {
  BaseEntity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationItem } from '../kit-ead-portal';

export class NotificationEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  public id = 0;

  @Column('date')
  public publishedAt = new Date();

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
    const parsedDate = new Date(item.date.replace(/\./g, '/'));

    return NotificationEntity.create({
      publishedAt: parsedDate,
      source: item.source,
      category: item.category,
      title: item.title,
      description: item.description || '',
      url: item.url || null,
    });
  }

  public static findSameEntity(item: NotificationItem) {
    const parsedDate = new Date(item.date.replace(/\./g, '/'));

    return NotificationEntity.findOne({
      where: {
        publishedAt: parsedDate,
        source: item.source,
        category: item.category,
        title: item.title,
        description: item.description || '',
        url: item.url || null,
      },
    });
  }
}
