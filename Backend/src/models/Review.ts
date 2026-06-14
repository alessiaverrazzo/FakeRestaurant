import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

/**
 * Attributi che definiscono la struttura dati di una recensione.
 * Mappa le colonne della tabella 'reviews'.
 */
interface ReviewAttributes {
  id: number;
  user_id: number;
  restaurant_id: number;
  content: string;
  parent_review_id?: number | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Attributi opzionali durante la creazione.
 * 'id' è autoincrementale, le date hanno default, 'parent_review_id' è null se è una recensione principale.
 */
interface ReviewCreationAttributes extends Optional<ReviewAttributes, 'id' | 'parent_review_id' | 'created_at' | 'updated_at'> {}

/**
 * Modello Sequelize per le recensioni.
 * Collega un utente a un ristorante tramite un contenuto testuale.
 * Supporta una struttura gerarchica (threading) tramite 'parent_review_id' per gestire le risposte.
 */
export class Review extends Model<ReviewAttributes, ReviewCreationAttributes> implements ReviewAttributes {
  public id!: number;
  public user_id!: number;
  public restaurant_id!: number;
  public content!: string;
  public parent_review_id!: number | null;
  public created_at!: Date;
  public updated_at!: Date;
}

/**
 * Inizializzazione del modello Review.
 * Configura i tipi di dato e le opzioni della tabella.
 */
Review.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    restaurant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    parent_review_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'reviews',
    timestamps: false, // gestisco i campi created_at/updated_at via trigger
  }
);

export default Review;
