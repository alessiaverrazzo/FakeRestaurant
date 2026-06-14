import { describe, it, beforeEach, expect, vi } from 'vitest';
import '@angular/compiler';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
  };
});

import { ReviewItemComponent } from
  '@features/reviews/review-tree/views/review-item/review-item.component';
import { ReviewTreeModel } from
  '@features/reviews/review-tree/models/review-tree.model';

function createReview(overrides: Partial<ReviewTreeModel> = {}): ReviewTreeModel {
  return {
    id: 1,
    userId: 10,
    restaurantId: 5,
    content: 'Test review',
    parentReviewId: null,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',

    upvotes: 3,
    downvotes: 1,
    userVote: 0,

    user: { username: 'mario', iconId: 2 },
    restaurantName: 'Fake Restaurant',

    replies: [],
    level: 0,
    collapsed: false,
    replyFormOpen: false,
    hasMoreChildren: false,
    maxSubtreeLevel: 0,

    ...overrides,
  };
}

describe('ReviewItemComponent', () => {
  let comp: ReviewItemComponent;
  let review: ReviewTreeModel;

  beforeEach(() => {
    review = createReview();
    comp = new ReviewItemComponent();
    comp.review = review;
    comp.isLoggedIn = false;
    comp.loggedUserId = null;
  });

  // ----------------------------------------------------------------
  describe('Proprietà calcolate', () => {
    it('indentPx: dovrebbe essere 0 per il livello 0', () => {
      review.level = 0;
      expect(comp.indentPx).toBe(0);
    });

    it('indentPx: dovrebbe essere 8 per i livelli superiori a 0', () => {
      review.level = 2;
      expect(comp.indentPx).toBe(8);
    });

    it('inThreadPage: dovrebbe essere true se startingReviewId è presente', () => {
      comp.startingReviewId = 10;
      expect(comp.inThreadPage).toBe(true);
    });

    it('inThreadPage: dovrebbe essere false se startingReviewId è nullo', () => {
      comp.startingReviewId = null;
      expect(comp.inThreadPage).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('Modalità di modifica', () => {
    it('toggleEditMode: dovrebbe abilitare la modalità e copiare il contenuto', () => {
      comp.toggleEditMode();

      expect(comp.editMode).toBe(true);
      expect(comp.editContent).toBe(review.content);
    });

    it('cancelEdit: dovrebbe disabilitare la modalità di modifica', () => {
      comp.editMode = true;
      comp.cancelEdit();

      expect(comp.editMode).toBe(false);
    });

    it("saveEdit: dovrebbe emettere 'reviewUpdated' con contenuto valido", () => {
      const spy = vi.spyOn(comp.reviewUpdated, 'emit');

      comp.toggleEditMode();
      comp.editContent = '  nuovo testo  ';
      comp.saveEdit();

      expect(spy).toHaveBeenCalledWith({
        id: review.id,
        content: 'nuovo testo',
      });
      expect(comp.editMode).toBe(false);
    });

    it('saveEdit: non dovrebbe emettere eventi se il contenuto è vuoto', () => {
      const spy = vi.spyOn(comp.reviewUpdated, 'emit');

      comp.toggleEditMode();
      comp.editContent = '   ';
      comp.saveEdit();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Form di risposta', () => {
    it('toggleReplyForm: dovrebbe alternare la visibilità del form', () => {
      comp.toggleReplyForm();
      expect(review.replyFormOpen).toBe(true);

      comp.toggleReplyForm();
      expect(review.replyFormOpen).toBe(false);
    });

    it('replyOverLimit: dovrebbe calcolare correttamente il superamento del limite', () => {
      comp.replyContent = 'a'.repeat(500);
      expect(comp.replyOverLimit).toBe(false);

      comp.replyContent = 'a'.repeat(501);
      expect(comp.replyOverLimit).toBe(true);
    });

    it('replyCounterColor: dovrebbe essere rosso se si supera il limite', () => {
      comp.replyContent = 'a'.repeat(501);
      expect(comp.replyCounterColor).toBe('text-red-accent');
    });

    it('replyCounterColor: dovrebbe essere rosso quando vicino al limite', () => {
      comp.replyContent = 'a'.repeat(461); // 500 - 39
      expect(comp.replyCounterColor).toBe('text-red-accent');
    });

    it('replyCounterColor: dovrebbe essere arancione quando si avvicina al limite', () => {
      comp.replyContent = 'a'.repeat(401); // 500 - 99
      expect(comp.replyCounterColor).toBe('text-orange-soft');
    });

    it('replyCounterColor: dovrebbe essere marrone quando lontano dal limite', () => {
      comp.replyContent = 'a'.repeat(100);
      expect(comp.replyCounterColor).toBe('text-brown-dark');
    });

    it("submitReply: non dovrebbe emettere l'evento se l'utente non è loggato", () => {
      const spy = vi.spyOn(comp.replyCreated, 'emit');

      comp.replyContent = 'ciao';
      comp.submitReply();

      expect(spy).not.toHaveBeenCalled();
    });

    it("submitReply: dovrebbe emettere 'replyCreated' con dati validi e chiudere il form", () => {
      const spy = vi.spyOn(comp.replyCreated, 'emit');

      comp.isLoggedIn = true;
      review.replyFormOpen = true;
      comp.replyContent = '  risposta valida   ';
      comp.submitReply();

      expect(spy).toHaveBeenCalledWith({
        parentId: review.id,
        content: 'risposta valida',
      });
      expect(review.replyFormOpen).toBe(false);
    });

    it("submitReply: non dovrebbe emettere l'evento se il contenuto ha solo spazi", () => {
      const spy = vi.spyOn(comp.replyCreated, 'emit');

      comp.isLoggedIn = true;
      review.replyFormOpen = true;
      comp.replyContent = '    \n   \t   ';

      comp.submitReply();

      expect(spy).not.toHaveBeenCalled();
      expect(review.replyFormOpen).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  describe('Votazione', () => {
    it("toggleVote: non dovrebbe emettere l'evento se l'utente non è loggato", () => {
      const spy = vi.spyOn(comp.vote, 'emit');

      comp.toggleVote('up');
      expect(spy).not.toHaveBeenCalled();
    });

    it("toggleVote: dovrebbe emettere l'evento 'vote' se l'utente è loggato", () => {
      const spy = vi.spyOn(comp.vote, 'emit');

      comp.isLoggedIn = true;
      comp.toggleVote('down');

      expect(spy).toHaveBeenCalledWith({
        type: 'down',
        id: review.id,
      });
    });
  });

  // ----------------------------------------------------------------
  describe('Cancellazione', () => {
    it('openDeleteModal e closeDeleteModal: dovrebbero alternare la visibilità del modale', () => {
      comp.openDeleteModal();
      expect(comp.showDeleteModal).toBe(true);

      comp.closeDeleteModal();
      expect(comp.showDeleteModal).toBe(false);
    });

    it("confirmDelete: dovrebbe emettere l'evento 'reviewDeleted' con l'id della recensione", () => {
      const spy = vi.spyOn(comp.reviewDeleted, 'emit');

      comp.confirmDelete();
      expect(spy).toHaveBeenCalledWith(review.id);
    });
  });

  // ----------------------------------------------------------------
  describe('Logica di profondità e thread', () => {
    it('getDepthLimit: dovrebbe ritornare il limite corretto per dispositivi mobili', () => {
      vi.stubGlobal('innerWidth', 500);
      expect(comp.getDepthLimit()).toBe(4);
    });

    it('getDepthLimit: dovrebbe ritornare il limite corretto per tablet', () => {
      vi.stubGlobal('innerWidth', 800);
      expect(comp.getDepthLimit()).toBe(9);
    });

    it('getDepthLimit: dovrebbe ritornare il limite corretto per desktop', () => {
      vi.stubGlobal('innerWidth', 1300);
      expect(comp.getDepthLimit()).toBe(14);
    });

    it('shouldOpenThread: dovrebbe essere true in homepage se il limite di profondità è superato', () => {
      vi.stubGlobal('innerWidth', 1300);

      review.level = 14;
      review.maxSubtreeLevel = 16;
      comp.startingReviewId = null;

      expect(comp.shouldOpenThread()).toBe(true);
    });

    it('shouldOpenThread: dovrebbe essere true in una pagina thread se il limite di profondità è superato', () => {
      vi.stubGlobal('innerWidth', 1300);

      comp.startingReviewId = 5;
      comp.startingLevel = 2;

      review.level = 16;
      review.maxSubtreeLevel = 18;

      expect(comp.shouldOpenThread()).toBe(true);
    });

    it("onOpenThreadClick: non dovrebbe emettere l'evento se non si supera il limite di profondità", () => {
      const spy = vi.spyOn(comp.openThread, 'emit');

      vi.stubGlobal('innerWidth', 1300);
      review.level = 1;
      review.maxSubtreeLevel = 1;

      comp.onOpenThreadClick();

      expect(spy).not.toHaveBeenCalled();
    });

    it("onOpenThreadClick: dovrebbe emettere l'evento 'openThread' se si supera il limite di profondità", () => {
      const spy = vi.spyOn(comp.openThread, 'emit');

      vi.stubGlobal('innerWidth', 1300);
      review.level = 14;
      review.maxSubtreeLevel = 20;

      comp.onOpenThreadClick();

      expect(spy).toHaveBeenCalledWith(review);
    });
  });
});
