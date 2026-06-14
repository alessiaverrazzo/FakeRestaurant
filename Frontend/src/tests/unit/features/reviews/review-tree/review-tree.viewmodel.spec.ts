import { describe, it, expect, beforeEach } from 'vitest';
import { ReviewTreeViewModel } from
  '@features/reviews/review-tree/viewmodels/review-tree.viewmodel';

function review(overrides: any = {}) {
  return {
    id: 1,
    userId: 1,
    restaurantId: 10,
    parentReviewId: null,
    content: 'test',
    createdAt: '2025',
    updatedAt: '2025',
    upvotes: 0,
    downvotes: 0,
    userVote: 1,
    user: {
      username: 'alice',
      iconId: 3,
    },
    restaurantName: 'Ristorante',
    replies: [],
    ...overrides,
  };
}

describe('ReviewTreeViewModel', () => {
  let vm: ReviewTreeViewModel;

  beforeEach(() => {
    vm = new ReviewTreeViewModel();
  });

  // ----------------------------------------------------------------
  describe('buildTree', () => {    
    it('dovrebbe ritornare un array vuoto per una lista vuota', () => {
      const res = vm.buildTree([]);
      expect(res).toEqual([]);
    });

    it('dovrebbe costruire una root senza figli', () => {
      const res = vm.buildTree([review()]);

      expect(res.length).toBe(1);
      expect(res[0].level).toBe(0);
      expect(res[0].replies).toEqual([]);
      expect(res[0].maxSubtreeLevel).toBe(0);
      expect(res[0].hasMoreChildren).toBe(false);
    });

    it('dovrebbe gestire più recensioni root', () => {
      const res = vm.buildTree([
        review({ id: 1 }),
        review({ id: 2 }),
      ]);

      expect(res.length).toBe(2);
      expect(res.map(r => r.id)).toEqual([1, 2]);
    });
  });

  // ----------------------------------------------------------------
  describe('buildNode (testato tramite buildTree)', () => {
    it('dovrebbe calcolare correttamente i livelli e maxSubtreeLevel', () => {
      const res = vm.buildTree([
        review({
          id: 1,
          replies: [
            review({
              id: 2,
              parentReviewId: 1,
              replies: [
                review({
                  id: 3,
                  parentReviewId: 2,
                }),
              ],
            }),
          ],
        }),
      ]);

      const root = res[0];
      const child = root.replies[0];
      const grandchild = child.replies[0];

      expect(root.level).toBe(0);
      expect(child.level).toBe(1);
      expect(grandchild.level).toBe(2);

      expect(root.maxSubtreeLevel).toBe(2);
      expect(child.maxSubtreeLevel).toBe(2);
      expect(grandchild.maxSubtreeLevel).toBe(2);

      expect(root.hasMoreChildren).toBe(true);
      expect(child.hasMoreChildren).toBe(true);
      expect(grandchild.hasMoreChildren).toBe(false);
    });

    it('dovrebbe gestire il caso in cui user è nullo', () => {
      const res = vm.buildTree([
        review({ user: null }),
      ]);

      expect(res[0].user).toBeNull();
    });

    it('dovrebbe gestire il caso in cui restaurantName è nullo', () => {
      const res = vm.buildTree([
        review({ restaurantName: null }),
      ]);

      expect(res[0].restaurantName).toBeNull();
    });

    it('dovrebbe normalizzare parentReviewId undefined a null', () => {
      const res = vm.buildTree([
        review({ parentReviewId: undefined }),
      ]);

      expect(res[0].parentReviewId).toBeNull();
    });

    it('dovrebbe gestire il caso in cui replies è undefined', () => {
        const res = vm.buildTree([
            review({ replies: undefined }),
        ]);

        expect(res[0].replies).toEqual([]);
        expect(res[0].hasMoreChildren).toBe(false);
        expect(res[0].maxSubtreeLevel).toBe(0);
    });

    it('dovrebbe gestire il caso in cui replies è nullo', () => {
        const res = vm.buildTree([
            review({ replies: null }),
        ]);

        expect(res[0].replies).toEqual([]);
        expect(res[0].hasMoreChildren).toBe(false);
        expect(res[0].maxSubtreeLevel).toBe(0);
    });

    it('dovrebbe impostare userVote a 0 se undefined', () => {
      const res = vm.buildTree([
        review({ userVote: undefined }),
      ]);

      expect(res[0].userVote).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  describe('flattenTree', () => {    
    it('dovrebbe ritornare un array vuoto per un albero vuoto', () => {
      const res = vm.flattenTree([]);
      expect(res).toEqual([]);
    });

    it('dovrebbe gestire un albero con un singolo nodo', () => {
      const tree = vm.buildTree([review()]);
      const flat = vm.flattenTree(tree);

      expect(flat.length).toBe(1);
      expect(flat[0].id).toBe(1);
    });

    it("dovrebbe appiattire l'albero usando un percorso DFS (pre-order)", () => {
      const tree = vm.buildTree([
        review({
          id: 1,
          replies: [
            review({ id: 2 }),
            review({
              id: 3,
              replies: [
                review({ id: 4 }),
              ],
            }),
          ],
        }),
      ]);

      const flat = vm.flattenTree(tree);

      expect(flat.map(n => n.id)).toEqual([1, 2, 3, 4]);
    });
  });
});
