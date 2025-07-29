import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'Users',
    timestamps: true,
})
export class User extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    username!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    password!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    email!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    profilePicture?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    name?: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    bio?: string;

    @Column({
        type: DataType.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
    })
    role!: 'user' | 'admin';
}