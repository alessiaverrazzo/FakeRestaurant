/**
 * Modello esteso per la visualizzazione delle recensioni ad albero.
 * Include i dati della recensione e proprietà specifiche per la gestione dello stato UI
 * (indentazione, espansione/collasso, form di risposta, evidenziazione).
 */
export interface ReviewTreeModel {
  id: number;
  userId: number;
  restaurantId: number;
  content: string;
  parentReviewId: number | null;
  createdAt: string;
  updatedAt: string;

  upvotes: number;
  downvotes: number;

  /** Dati dell'autore della recensione. */
  user: {
    username: string;
    iconId: number;
  } | null;

  restaurantName: string | null;

  /** Voto dell'utente corrente su questa recensione. */
  userVote: 1 | -1 | 0;

  /** Sottorecensioni (figli). */
  replies: ReviewTreeModel[];

  /** Livello di profondità nell'albero (0 = radice). Usato per l'indentazione. */
  level: number;
  /** Stato di visualizzazione: true se i figli sono nascosti. */
  collapsed: boolean;
  /** Stato del form di risposta: true se aperto. */
  replyFormOpen: boolean;
  /** Flag per indicare se ci sono altre risposte da caricare (paginazione). */
  hasMoreChildren: boolean;
  /** Profondità massima del sottoalbero (utile per calcoli di layout). */
  maxSubtreeLevel: number;
  /** Flag per evidenziare visivamente la recensione (es. deep linking). */
  isHighlighted?: boolean;
  /** Origine dell'evidenziazione (es. da notifica). */
  highlightSource?: 'notification' | null;
}
