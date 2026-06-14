import User from './User';
import Restaurant from './Restaurant';
import Review from './Review';
import VoteRestaurant from './VoteRestaurant';
import VoteReview from './VoteReview';
import Notification from './Notification';
import { PasswordReset } from './PasswordReset';

/**
 * Definizione delle associazioni tra i modelli Sequelize.
 * Questo file stabilisce le relazioni (1:1, 1:N, N:M) tra le tabelle del database,
 * configurando chiavi esterne, alias e comportamenti di cancellazione/aggiornamento (CASCADE).
 */

/* ============================================================
   USER ↔ RESTAURANT
   Un utente (proprietario) può possedere più ristoranti.
   Un ristorante appartiene a un solo utente.
   ============================================================ */
User.hasMany(Restaurant, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'restaurants',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Restaurant.belongsTo(User, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'owner',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   USER ↔ REVIEW
   Un utente può scrivere molte recensioni.
   Una recensione appartiene a un solo utente.
   ============================================================ */
User.hasMany(Review, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'reviews',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Review.belongsTo(User, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   RESTAURANT ↔ REVIEW
   Un ristorante può avere molte recensioni.
   Una recensione appartiene a un solo ristorante.
   ============================================================ */
Restaurant.hasMany(Review, {
  foreignKey: { name: 'restaurant_id', allowNull: false },
  as: 'reviews',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Review.belongsTo(Restaurant, {
  foreignKey: { name: 'restaurant_id', allowNull: false },
  as: 'restaurant',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   REVIEW ↔ REVIEW (sub-replies)
   Relazione ricorsiva: una recensione può avere risposte (figlie).
   Una risposta appartiene a una recensione genitore.
   ============================================================ */
Review.hasMany(Review, {
  foreignKey: { name: 'parent_review_id', allowNull: true },
  as: 'replies',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true,
});

Review.belongsTo(Review, {
  foreignKey: { name: 'parent_review_id', allowNull: true },
  as: 'parent',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   USER ↔ RESTAURANT_VOTE
   Un utente può votare più ristoranti (ma solo una volta per ristorante, vedi vincoli nel modello).
   Un voto appartiene a un utente.
   ============================================================ */
User.hasMany(VoteRestaurant, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'restaurantVotes',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

VoteRestaurant.belongsTo(User, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   RESTAURANT ↔ RESTAURANT_VOTE
   Un ristorante riceve molti voti.
   Un voto appartiene a un ristorante.
   ============================================================ */
Restaurant.hasMany(VoteRestaurant, {
  foreignKey: { name: 'restaurant_id', allowNull: false },
  as: 'votes',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

VoteRestaurant.belongsTo(Restaurant, {
  foreignKey: { name: 'restaurant_id', allowNull: false },
  as: 'restaurant',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   USER ↔ REVIEW_VOTE
   Un utente può votare più recensioni.
   Un voto appartiene a un utente.
   ============================================================ */
User.hasMany(VoteReview, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'reviewVotes',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

VoteReview.belongsTo(User, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   REVIEW ↔ REVIEW_VOTE
   Una recensione riceve molti voti.
   Un voto appartiene a una recensione.
   ============================================================ */
Review.hasMany(VoteReview, {
  foreignKey: { name: 'review_id', allowNull: false },
  as: 'votes',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

VoteReview.belongsTo(Review, {
  foreignKey: { name: 'review_id', allowNull: false },
  as: 'review',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   USER ↔ NOTIFICATION (destinatario)
   Un utente riceve molte notifiche.
   Una notifica appartiene a un utente destinatario.
   ============================================================ */
User.hasMany(Notification, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'notifications',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Notification.belongsTo(User, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

/* ============================================================
   USER ↔ NOTIFICATION (attore)
   Una notifica è generata da un utente (attore).
   Se l'utente viene cancellato, l'attore diventa NULL (SET NULL).
   ============================================================ */
Notification.belongsTo(User, {
  foreignKey: { name: 'actor_id', allowNull: true },
  as: 'actor',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

/* ============================================================
   NOTIFICATION ↔ REVIEW (polymorphic: if target_type = 'review')
   Associazione polimorfica manuale per collegare la notifica alla recensione target.
   constraints: false è necessario perché target_id non è una FK reale verso una sola tabella.
   ============================================================ */
Notification.belongsTo(Review, {
  foreignKey: 'target_id',
  as: 'review',
  constraints: false,     // evita vincoli FK polimorfici
});

/* ============================================================
   NOTIFICATION ↔ RESTAURANT (polymorphic: if target_type = 'restaurant')
   Associazione polimorfica manuale per collegare la notifica al ristorante target.
   ============================================================ */
Notification.belongsTo(Restaurant, {
  foreignKey: 'target_id',
  as: 'restaurant',
  constraints: false,
});

/* ============================================================
   USER ↔ PASSWORD_RESET_TOKEN
   Un utente può avere richieste di reset password.
   Un token appartiene a un utente.
   ============================================================ */
User.hasMany(PasswordReset, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'passwordResetTokens',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

PasswordReset.belongsTo(User, {
  foreignKey: { name: 'user_id', allowNull: false },
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
