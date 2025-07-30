import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  Default,
} from 'sequelize-typescript';
import { User } from './User';
import { Post } from './Post';

@Table({
  tableName: 'Report',
  timestamps: true,
})
export class Report extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare user_id: string;

  @BelongsTo(() => User, { as: 'reporter' })
  declare user: User;

  @ForeignKey(() => Post)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare post_id: string;

  @BelongsTo(() => Post)
  declare post: Post;

  @Column({
    type: DataType.ENUM('spam', 'harassment', 'hate_speech', 'nudity', 'misinformation', 'other'),
    allowNull: false,
  })
  declare reason: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare comment?: string;

  @Column({
    type: DataType.ENUM('pending', 'reviewed', 'dismissed', 'resolved'),
    allowNull: false,
    defaultValue: 'pending',
  })
  declare status: 'pending' | 'reviewed' | 'dismissed' | 'resolved';

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare updatedAt?: Date;
}
