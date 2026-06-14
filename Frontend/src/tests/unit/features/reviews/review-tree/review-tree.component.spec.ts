import { describe, it, beforeEach, expect, vi, afterEach } from 'vitest';
import '@angular/compiler';
import { of, throwError } from 'rxjs';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
  };
});

import { ReviewTreeComponent } from
  '@features/reviews/review-tree/views/review-tree/review-tree.component';
import { ReviewTreeViewModel } from
  '@features/reviews/review-tree/viewmodels/review-tree.viewmodel';
import { ReviewTreeModel } from
  '@features/reviews/review-tree/models/review-tree.model';

function createReviewTree(overrides: Partial<ReviewTreeModel> = {}): ReviewTreeModel {
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
    userVote: 0,
    user: null,
    restaurantName: null,
    replies: [],
    level: 0,
    collapsed: false,
    replyFormOpen: false,
    hasMoreChildren: false,
    maxSubtreeLevel: 0,
    ...overrides,
  };
}

function createReviewServiceMock() {
  return {
    getByRestaurantId: vi.fn(),
    getUserVote: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    voteReview: vi.fn(),
  };
}

function createRouterMock() {
  return {
    navigate: vi.fn(),
  };
}

describe('ReviewTreeComponent', () => {
  let comp: ReviewTreeComponent;
  let service: any;
  let router: any;

  beforeEach(() => {
    service = createReviewServiceMock();
    router = createRouterMock();

    service.getByRestaurantId.mockReturnValue(of([]));
    service.getUserVote.mockReturnValue(of(0));

    comp = new ReviewTreeComponent(service, router);
    comp.restaurantId = 10;
    comp.isLoggedIn = false;
    comp.loggedUserId = null;

    vi.spyOn(ReviewTreeViewModel.prototype, 'buildTree');
    vi.spyOn(ReviewTreeViewModel.prototype, 'flattenTree');
  });

  function node(
    id: number,
    level: number,
    replies: ReviewTreeModel[] = []
    ): ReviewTreeModel {
        return createReviewTree({
            id,
            level,
            replies,
            maxSubtreeLevel: Math.max(level, ...replies.map(r => r.maxSubtreeLevel)),
        });
  }

  // ----------------------------------------------------------------
  describe('ngOnChanges', () => {
    it('dovrebbe resettare e ricaricare le recensioni se restaurantId cambia', () => {
        service.getByRestaurantId.mockReturnValue(of([]));

        const spy = vi.spyOn(comp, 'loadReviews');

        comp.ngOnChanges({
            restaurantId: {
            currentValue: 10,
            previousValue: 5,
            firstChange: false,
            isFirstChange: () => false,
            }
        } as any);

        expect(spy).toHaveBeenCalled();
        expect(comp.reviewsTree()).toEqual([]);
    });

    it('non dovrebbe resettare se startingReviewId cambia per la prima volta', () => {
        service.getByRestaurantId.mockReturnValue(of([]));
        const loadSpy = vi.spyOn(comp, 'loadReviews');

        // stato pre-esistente (per verificare che NON resetta)
        const tree = [createReviewTree({ id: 1 })];
        comp.reviewsTree.set(tree);
        comp.selectedThread.set(createReviewTree({ id: 999 }));

        comp.ngOnChanges({
            startingReviewId: {
            currentValue: 123,
            previousValue: null,
            firstChange: true,
            isFirstChange: () => true,
            }
        } as any);

        // NON reset
        expect(comp.reviewsTree()).toBe(tree);
        expect(comp.selectedThread()?.id).toBe(999);

        // NON loadReviews (a meno di restaurantChanged/highlightChanged, qui assenti)
        expect(loadSpy).not.toHaveBeenCalled();
    });

    it('dovrebbe resettare e ricaricare se startingReviewId cambia dopo la prima volta', () => {
        service.getByRestaurantId.mockReturnValue(of([]));
        const loadSpy = vi.spyOn(comp, 'loadReviews');

        comp.reviewsTree.set([createReviewTree({ id: 1 })]);
        comp.selectedThread.set(createReviewTree({ id: 999 }));

        comp.ngOnChanges({
            startingReviewId: {
            currentValue: 20,
            previousValue: 10,
            firstChange: false,
            isFirstChange: () => false,
            }
        } as any);

        expect(comp.reviewsTree()).toEqual([]);
        expect(comp.selectedThread()).toBeNull();
        expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('dovrebbe resettare e ricaricare quando restaurantId cambia', () => {
        service.getByRestaurantId.mockReturnValue(of([]));
        const loadSpy = vi.spyOn(comp, 'loadReviews');

        comp.restaurantId = 10; // serve perché restaurantChanged = !!changes && this.restaurantId
        comp.reviewsTree.set([createReviewTree({ id: 1 })]);
        comp.selectedThread.set(createReviewTree({ id: 999 }));

        comp.ngOnChanges({
            restaurantId: {
            currentValue: 10,
            previousValue: 5,
            firstChange: false,
            isFirstChange: () => false,
            }
        } as any);

        expect(comp.reviewsTree()).toEqual([]);
        expect(comp.selectedThread()).toBeNull();
        expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('dovrebbe ricaricare senza resettare se cambia solo highlightRootReviewId', () => {
        service.getByRestaurantId.mockReturnValue(of([]));

        const loadSpy = vi.spyOn(comp, 'loadReviews');
        const applySpy = vi.spyOn(comp as any, 'applyTree');

        // stato iniziale
        const tree = [createReviewTree({ id: 1 })];
        comp.reviewsTree.set(tree);
        comp.selectedThread.set(createReviewTree({ id: 999 }));

        comp.startingReviewId = null;

        comp.ngOnChanges({
            highlightRootReviewId: {
            currentValue: 1,
            previousValue: null,
            firstChange: false,
            isFirstChange: () => false,
            }
        } as any);

        expect(loadSpy).toHaveBeenCalledTimes(1);
        expect(applySpy).toHaveBeenCalledTimes(1);

        expect(comp.selectedThread()?.id).toBe(999);
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione errori e utilità', () => {
    it('handleError: dovrebbe usare err.error.message se presente', () => {
        const err = {
            error: {
            message: 'Errore dal backend'
            }
        };

        (comp as any).handleError(err);

        expect(comp.globalError()).toBe('Errore dal backend');
    });

    it('handleError: dovrebbe usare err.message come fallback', () => {
        const err = {
            message: 'Errore generico'
        };

        (comp as any).handleError(err);

        expect(comp.globalError()).toBe('Errore generico');
    });

    it('handleError: dovrebbe usare un messaggio di default se nessun altro è presente', () => {
        const err = {};

        (comp as any).handleError(err);

        expect(comp.globalError()).toBe(
            'Si è verificato un errore. Riprova più tardi.'
        );
    });

    it('getDepthLimit: dovrebbe ritornare 4 per mobile', () => {
        vi.stubGlobal('innerWidth', 500);

        const limit = (comp as any).getDepthLimit();

        expect(limit).toBe(4);
    });

    it('getDepthLimit: dovrebbe ritornare 9 per tablet', () => {
        vi.stubGlobal('innerWidth', 800);

        const limit = (comp as any).getDepthLimit();

        expect(limit).toBe(9);
    });

    it('getDepthLimit: dovrebbe ritornare 14 per desktop', () => {
        vi.stubGlobal('innerWidth', 1400);

        const limit = (comp as any).getDepthLimit();

        expect(limit).toBe(14);
    });
  });

  // ----------------------------------------------------------------
  describe('applyDepthLimit', () => {
    it('dovrebbe ritornare null se il livello del nodo supera il limite', () => {
        const n = node(1, 5);

        const res = (comp as any).applyDepthLimit(n, 3);

        expect(res).toBeNull();
    });

    it('dovrebbe troncare le risposte se il livello del nodo è uguale al limite', () => {
        const n = node(1, 3, []);

        const res = (comp as any).applyDepthLimit(n, 3);

        expect(res).not.toBeNull();
        expect(res!.replies).toEqual([]);
        expect(res!.hasMoreChildren).toBe(false);
    });

    it("dovrebbe impostare hasMoreChildren a true se ci sono figli oltre il limite", () => {
        const child = node(2, 4);
        const n = node(1, 3, [child]);

        const res = (comp as any).applyDepthLimit(n, 3);

        expect(res).not.toBeNull();
        expect(res!.replies).toEqual([]);
        expect(res!.hasMoreChildren).toBe(true);
    });

    it('dovrebbe mantenere i figli se sono entro il limite', () => {
        const child = node(2, 2);
        const n = node(1, 1, [child]);

        const res = (comp as any).applyDepthLimit(n, 3);

        expect(res).not.toBeNull();
        expect(res!.replies.length).toBe(1);
        expect(res!.hasMoreChildren).toBe(false);
    });

    it('dovrebbe scartare i figli oltre il limite e mantenere gli altri', () => {
        const ok = node(2, 2);
        const tooDeep = node(3, 5);
        const n = node(1, 1, [ok, tooDeep]);

        const res = (comp as any).applyDepthLimit(n, 3);

        expect(res).not.toBeNull();
        expect(res!.replies.length).toBe(1);
        expect(res!.replies[0].id).toBe(2);
        expect(res!.hasMoreChildren).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  describe('filterThreadView', () => {

    beforeEach(() => {
        // forza un depth limit controllabile
        vi.spyOn(comp as any, 'getDepthLimit').mockReturnValue(2);

        // flattenTree reale ma deterministico
        vi.spyOn(ReviewTreeViewModel.prototype, 'flattenTree')
        .mockImplementation((tree: ReviewTreeModel[]) => {
            const out: ReviewTreeModel[] = [];
            const walk = (n: ReviewTreeModel) => {
            out.push(n);
            n.replies.forEach(walk);
            };
            tree.forEach(walk);
            return out;
        });
    });

    it('dovrebbe ritornare l\'albero invariato se non c\'è uno startingReviewId', () => {
        const tree = [
        createReviewTree({ id: 1, level: 0 })
        ];

        comp.startingReviewId = null;

        const res = (comp as any).filterThreadView(tree);

        expect(res).toBe(tree);
    });

    it('dovrebbe ritornare un array vuoto se la root del thread non viene trovata', () => {
        const tree = [
        createReviewTree({ id: 1, level: 0 })
        ];

        comp.startingReviewId = 999;

        const res = (comp as any).filterThreadView(tree);

        expect(res).toEqual([]);
    });

    it('dovrebbe mantenere il sottoalbero se la root viene trovata', () => {
        const child = createReviewTree({
        id: 2,
        level: 1,
        replies: [],
        maxSubtreeLevel: 1,
        });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [child],
        maxSubtreeLevel: 1,
        });

        const tree = [root];

        comp.startingReviewId = 1;

        const res = (comp as any).filterThreadView(tree);

        expect(res.length).toBe(1);
        expect(res[0].level).toBe(0);          // normalizzato
        expect(res[0].replies.length).toBe(1);
        expect(res[0].hasMoreChildren).toBe(false);
    });

    it('dovrebbe filtrare i figli oltre il limite e impostare hasMoreChildren a true', () => {
        const okChild = createReviewTree({
        id: 2,
        level: 1,
        replies: [],
        maxSubtreeLevel: 1,
        });

        const deepChild = createReviewTree({
        id: 3,
        level: 5, // fuori range
        replies: [],
        maxSubtreeLevel: 5,
        });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [okChild, deepChild],
        maxSubtreeLevel: 5,
        });

        const tree = [root];

        comp.startingReviewId = 1;

        const res = (comp as any).filterThreadView(tree);

        expect(res[0].replies.length).toBe(1);
        expect(res[0].replies[0].id).toBe(2);
        expect(res[0].hasMoreChildren).toBe(true);
    });

    it('dovrebbe ritornare un array vuoto se il nodo filtrato risulta nullo', () => {
        // depth limit fisso
        vi.spyOn(comp as any, 'getDepthLimit').mockReturnValue(2);

        // flattenTree reale deterministico
        vi.spyOn(ReviewTreeViewModel.prototype, 'flattenTree')
            .mockImplementation((tree: ReviewTreeModel[]) => {
            const out: ReviewTreeModel[] = [];
            const walk = (n: ReviewTreeModel) => {
                out.push(n);
                n.replies.forEach(walk);
            };
            tree.forEach(walk);
            return out;
            });

        // Root "tricky": level cambia valore tra:
        // - prima lettura (originalRootLevel)
        // - lettura dentro filterNode (per farlo tornare null)
        const root = createReviewTree({
            id: 1,
            replies: [],
            maxSubtreeLevel: 0,
        }) as any;

        let reads = 0;
        Object.defineProperty(root, 'level', {
            configurable: true,
            get() {
            reads++;
            return reads === 1 ? 10 : 999; // 1ª lettura: 10, poi: 999 (fuori range)
            }
        });

        comp.startingReviewId = 1;

        const res = (comp as any).filterThreadView([root]);

        expect(res).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  describe('findNodeById (helper)', () => {
    beforeEach(() => {
        vi.spyOn(ReviewTreeViewModel.prototype, 'flattenTree')
        .mockImplementation((tree: ReviewTreeModel[]) => {
            const out: ReviewTreeModel[] = [];
            const walk = (n: ReviewTreeModel) => {
            out.push(n);
            n.replies.forEach(walk);
            };
            tree.forEach(walk);
            return out;
        });
    });

    it('dovrebbe ritornare null se l\'albero è vuoto', () => {
        const res = (comp as any).findNodeById([], 1);
        expect(res).toBeNull();
    });

    it('dovrebbe ritornare il nodo se l\'id corrisponde a una root', () => {
        const root = createReviewTree({ id: 1, level: 0 });
        const tree = [root];

        const res = (comp as any).findNodeById(tree, 1);

        expect(res).toBe(root);
    });

    it('dovrebbe ritornare il nodo se l\'id corrisponde a un figlio', () => {
        const child = createReviewTree({ id: 2, level: 1 });
        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [child],
        });

        const tree = [root];

        const res = (comp as any).findNodeById(tree, 2);

        expect(res).toBe(child);
    });

    it('dovrebbe ritornare null se l\'id non viene trovato', () => {
        const root = createReviewTree({ id: 1, level: 0 });
        const tree = [root];

        const res = (comp as any).findNodeById(tree, 999);

        expect(res).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('cloneSubtree (helper)', () => {

    it('dovrebbe clonare ed evidenziare solo la root se corrisponde a highlightId', () => {
        const child = createReviewTree({
        id: 2,
        level: 1,
        });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [child],
        });

        const res = (comp as any).cloneSubtree(root, 1);

        // root
        expect(res.id).toBe(1);
        expect(res.isHighlighted).toBe(true);
        expect(res.highlightSource).toBe('notification');
        expect(res.level).toBe(0);

        // child (clonato)
        expect(res.replies.length).toBe(1);
        expect(res.replies[0].id).toBe(2);
        expect(res.replies[0].isHighlighted).toBe(false);
        expect(res.replies[0].highlightSource).toBeNull();
        expect(res.replies[0].level).toBe(1);
    });

    it('dovrebbe mantenere le distanze di livello relative durante la clonazione', () => {
        const deepChild = createReviewTree({
            id: 3,
            level: 2,
        });

        const child = createReviewTree({
            id: 2,
            level: 1,
            replies: [deepChild],
        });

        const root = createReviewTree({
            id: 1,
            level: 1, // base ≠ 0
            replies: [child],
        });

        const res = (comp as any).cloneSubtree(root, 1);

        // root sempre 0
        expect(res.level).toBe(0);

        // distanza relativa conservata
        expect(res.replies[0].level).toBe(
            child.level - root.level
        );

        expect(res.replies[0].replies[0].level).toBe(
            deepChild.level - root.level
        );
    });

    it('non dovrebbe evidenziare altri nodi quando la root è evidenziata', () => {
        const child = createReviewTree({
        id: 2,
        level: 1,
        });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [child],
        });

        const res = (comp as any).cloneSubtree(root, 1);

        expect(res.replies[0].isHighlighted).toBe(false);
        expect(res.replies[0].highlightSource).toBeNull();
    });

    it('non dovrebbe evidenziare la root se l\'highlight è su un figlio', () => {
        const child = createReviewTree({
        id: 2,
        level: 1,
        });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [child],
        maxSubtreeLevel: 2,
        });

        const res = (comp as any).cloneSubtree(root, 2);

        expect(res.isHighlighted).toBe(false);
        expect(res.highlightSource).toBeNull();
        expect(res.level).toBe(0);
    });

    it('dovrebbe mantenere solo i figli diretti quando l\'highlight è su un figlio', () => {
        const grandChild = createReviewTree({
        id: 3,
        level: 2,
        });

        const child = createReviewTree({
        id: 2,
        level: 1,
        replies: [grandChild],
        });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [child],
        });

        const res = (comp as any).cloneSubtree(root, 2);

        expect(res.replies.length).toBe(1);
        expect(res.replies[0].id).toBe(2);
        expect(res.replies[0].replies.length).toBe(0); // nipoti rimossi
    });

    it('dovrebbe impostare highlightSource a "notification" sul figlio evidenziato', () => {
        const child = createReviewTree({
        id: 2,
        level: 1,
        });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [child],
        });

        const res = (comp as any).cloneSubtree(root, 2);

        expect(res.replies[0].isHighlighted).toBe(true);
        expect(res.replies[0].highlightSource).toBe('notification');
    });

    it('non dovrebbe evidenziare i figli non target', () => {
        const c1 = createReviewTree({ id: 2, level: 1 });
        const c2 = createReviewTree({ id: 3, level: 1 });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [c1, c2],
        });

        const res = (comp as any).cloneSubtree(root, 2);

        expect(res.replies[1].isHighlighted).toBe(false);
        expect(res.replies[1].highlightSource).toBeNull();
    });

    it('dovrebbe forzare maxSubtreeLevel e hasMoreChildren a valori corretti', () => {
        const child = createReviewTree({
        id: 2,
        level: 1,
        });

        const root = createReviewTree({
        id: 1,
        level: 0,
        replies: [child],
        maxSubtreeLevel: 5,
        });

        const res = (comp as any).cloneSubtree(root, 2);

        expect(res.maxSubtreeLevel).toBe(1);
        expect(res.hasMoreChildren).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('applyTree (logica di visualizzazione)', () => {
    beforeEach(() => {
        vi.useFakeTimers();

        vi.spyOn(comp as any, 'scrollToReview').mockImplementation(() => {});
        vi.spyOn(comp as any, 'cloneSubtree').mockImplementation((r: any) => ({ ...r, promoted: true }));
        vi.spyOn(comp as any, 'filterThreadView').mockImplementation((t: any) => t);
        vi.spyOn(comp as any, 'applyDepthLimit').mockImplementation((r: any) => r);
        vi.spyOn(comp as any, 'getDepthLimit').mockReturnValue(2);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('dovrebbe promuovere e scrollare alla recensione evidenziata', () => {
        const root = createReviewTree({ id: 1, level: 0 });
        const tree = [root];

        comp.startingReviewId = null;
        comp.highlightRootReviewId = 1;
        comp.highlightReviewId = 99;

        vi.spyOn(comp as any, 'findNodeById').mockReturnValue(root);

        (comp as any).applyTree(tree);

        expect(comp.reviewsTree()).toEqual([
        { ...root, promoted: true },
        root
        ]);

        vi.runAllTimers();
        expect((comp as any).scrollToReview).toHaveBeenCalledWith(99);
    });

    it('non dovrebbe fare nulla se la root da evidenziare non viene trovata', () => {
        const root = createReviewTree({ id: 1, level: 0 });
        const tree = [root];

        comp.startingReviewId = null;
        comp.highlightRootReviewId = 99;
        comp.highlightReviewId = 100;

        vi.spyOn(comp as any, 'findNodeById').mockReturnValue(null);

        const spyFilter = vi.spyOn(comp as any, 'filterThreadView');

        (comp as any).applyTree(tree);

        expect(spyFilter).not.toHaveBeenCalled();
    });

    it('dovrebbe filtrare per il thread corrente se startingReviewId è presente', () => {
        const tree = [createReviewTree({ id: 1, level: 0 })];

        comp.startingReviewId = 1;

        const filtered = [{ id: 999 }];
        (comp as any).filterThreadView = vi.fn().mockReturnValue(filtered);

        (comp as any).applyTree(tree);

        expect((comp as any).filterThreadView).toHaveBeenCalledWith(tree);
        expect(comp.reviewsTree()).toBe(filtered);
    });

    it('dovrebbe applicare il limite di profondità e filtrare i nodi nulli', () => {
        const r1 = createReviewTree({ id: 1, level: 0 });
        const r2 = createReviewTree({ id: 2, level: 5 });

        const tree = [r1, r2];

        comp.startingReviewId = null;
        comp.highlightRootReviewId = null;
        comp.highlightReviewId = null;

        (comp as any).applyDepthLimit = vi
        .fn()
        .mockImplementation((r: any) => r.id === 1 ? r : null);

        (comp as any).applyTree(tree);

        expect(comp.reviewsTree()).toEqual([r1]);
    });

    it('dovrebbe mantenere tutti i nodi se nessuno viene filtrato', () => {
        const r1 = createReviewTree({ id: 1, level: 0 });
        const r2 = createReviewTree({ id: 2, level: 1 });

        const tree = [r1, r2];

        comp.startingReviewId = null;
        comp.highlightRootReviewId = null;
        comp.highlightReviewId = null;

        (comp as any).applyDepthLimit = vi.fn().mockImplementation(r => r);

        (comp as any).applyTree(tree);

        expect(comp.reviewsTree()).toEqual([r1, r2]);
    });
  });

  // ----------------------------------------------------------------
  describe('loadReviews (logica di caricamento)', () => {
    beforeEach(() => {
        vi.spyOn(comp as any, 'applyTree').mockImplementation(() => {});
        vi.spyOn(comp as any, 'handleError').mockImplementation(() => {});
        vi.spyOn(ReviewTreeViewModel.prototype, 'buildTree')
        .mockImplementation((r: any) => r as any);
        vi.spyOn(ReviewTreeViewModel.prototype, 'flattenTree')
        .mockImplementation((tree: any[]) => tree);
    });

    it('non dovrebbe caricare i voti utente se non loggato', () => {
        const reviews = [
        createReviewTree({ id: 1, level: 0 })
        ];

        comp.isLoggedIn = false;
        comp.loggedUserId = null;
        comp.restaurantId = 10;

        service.getByRestaurantId.mockReturnValue(of(reviews));

        comp.loadReviews();

        expect((comp as any).applyTree).toHaveBeenCalledWith(reviews);
        expect(service.getUserVote).not.toHaveBeenCalled();
    });

    it('non dovrebbe caricare i voti utente se loggato ma con loggedUserId nullo', () => {
        const reviews = [
        createReviewTree({ id: 1, level: 0 })
        ];

        comp.isLoggedIn = true;
        comp.loggedUserId = null;
        comp.restaurantId = 10;

        service.getByRestaurantId.mockReturnValue(of(reviews));

        comp.loadReviews();

        expect((comp as any).applyTree).toHaveBeenCalledWith(reviews);
        expect(service.getUserVote).not.toHaveBeenCalled();
    });

    it('dovrebbe caricare i voti utente per ogni recensione se loggato', () => {
        const n1 = createReviewTree({ id: 1, level: 0 });
        const n2 = createReviewTree({ id: 2, level: 1 });

        const tree = [n1, n2];

        comp.isLoggedIn = true;
        comp.loggedUserId = 5;
        comp.restaurantId = 10;

        service.getByRestaurantId.mockReturnValue(of(tree));
        service.getUserVote
        .mockReturnValueOnce(of(1))
        .mockReturnValueOnce(of(-1));

        comp.loadReviews();

        expect(service.getUserVote).toHaveBeenCalledTimes(2);
        expect(n1.userVote).toBe(1);
        expect(n2.userVote).toBe(-1);
    });

    it('dovrebbe impostare userVote a 0 in caso di errore nel caricamento del voto', () => {
        const n1 = createReviewTree({ id: 1, level: 0 });

        const tree = [n1];

        comp.isLoggedIn = true;
        comp.loggedUserId = 5;
        comp.restaurantId = 10;

        service.getByRestaurantId.mockReturnValue(of(tree));
        service.getUserVote.mockReturnValue(
        throwError(() => new Error('boom'))
        );

        comp.loadReviews();

        expect(n1.userVote).toBe(0);
    });

    it('dovrebbe chiamare applyTree una sola volta dopo aver caricato tutti i voti', () => {
        const n1 = createReviewTree({ id: 1, level: 0 });
        const n2 = createReviewTree({ id: 2, level: 1 });

        const tree = [n1, n2];

        comp.isLoggedIn = true;
        comp.loggedUserId = 7;
        comp.restaurantId = 10;

        service.getByRestaurantId.mockReturnValue(of(tree));

        service.getUserVote.mockImplementation(() =>
        of(1)
        );

        comp.loadReviews();

        expect((comp as any).applyTree).toHaveBeenCalledTimes(1);
        expect((comp as any).applyTree).toHaveBeenCalledWith(tree);
    });

    it('dovrebbe gestire gli errori durante il caricamento delle recensioni', () => {
        comp.restaurantId = 10;

        service.getByRestaurantId.mockReturnValue(
        throwError(() => ({ message: 'errore backend' }))
        );

        comp.loadReviews();

        expect((comp as any).handleError).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('changeSort', () => {
    it('dovrebbe aggiornare la modalità di ordinamento e ricaricare le recensioni', () => {
        service.getByRestaurantId.mockReturnValue(of([]));

        const spy = vi.spyOn(comp, 'loadReviews');

        comp.changeSort('newest');

        expect(comp.sortMode()).toBe('newest');
        expect(spy).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Creazione recensione (root)', () => {
    it('dovrebbe creare la recensione e ricaricare se il testo è valido', () => {
        service.create.mockReturnValue(of({}));
        const spy = vi.spyOn(comp, 'loadReviews');

        comp.onSubmitRootReview({ content: 'ciao' });

        expect(service.create).toHaveBeenCalled();
        expect(spy).toHaveBeenCalled();
    });

    it('non dovrebbe creare la recensione se il testo è vuoto', () => {
        comp.onSubmitRootReview({ content: '   ' });
        expect(service.create).not.toHaveBeenCalled();
    });

    it('dovrebbe gestire gli errori durante la creazione', () => {
        const err = { message: 'errore create' };

        comp.restaurantId = 10;

        vi.spyOn(comp as any, 'loadReviews').mockImplementation(() => {});
        vi.spyOn(comp as any, 'handleError').mockImplementation(() => {});

        service.create.mockReturnValue(
            throwError(() => err)
        );

        comp.onSubmitRootReview({ content: 'test valido' });

        expect(service.create).toHaveBeenCalledWith({
            restaurantId: 10,
            content: 'test valido',
            parentReviewId: null,
        });

        expect(comp['handleError']).toHaveBeenCalledWith(err);
        expect(comp['loadReviews']).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Creazione risposta (reply)', () => {
    beforeEach(() => {
        vi.spyOn(ReviewTreeViewModel.prototype, 'flattenTree')
        .mockImplementation((tree: ReviewTreeModel[]) => {
            const out: ReviewTreeModel[] = [];
            const walk = (n: ReviewTreeModel) => {
            out.push(n);
            n.replies.forEach(walk);
            };
            tree.forEach(walk);
            return out;
        });

        vi.spyOn(comp as any, 'handleError').mockImplementation(() => {});
    });

    it('non dovrebbe creare la risposta se il testo è vuoto', () => {
        comp.onReplyCreated({ parentId: 1, content: '     ' });

        expect(service.create).not.toHaveBeenCalled();
    });

    it('non dovrebbe creare la risposta se il testo supera i 500 caratteri', () => {
        const long = 'a'.repeat(501);

        comp.onReplyCreated({ parentId: 1, content: long });

        expect(service.create).not.toHaveBeenCalled();
    });

    it('non dovrebbe aggiungere la risposta all\'albero se il genitore non viene trovato', () => {
        const tree = [
        createReviewTree({ id: 1 }),
        ];

        comp.reviewsTree.set(tree);

        service.create.mockReturnValue(
        of({
            id: 99,
            userId: 2,
            restaurantId: 10,
            parentReviewId: 999, // non esiste
            content: 'reply',
            createdAt: '2025',
            updatedAt: '2025',
            upvotes: 0,
            downvotes: 0,
            user: null,
            restaurantName: null,
        })
        );

        comp.onReplyCreated({ parentId: 999, content: 'reply' });

        expect(tree[0].replies.length).toBe(0);
    });

    it('in caso di successo, dovrebbe costruire il figlio con user e restaurantName nulli se non forniti', () => {
        const parent = createReviewTree({ id: 1, level: 0 });
        const tree = [parent];

        comp.reviewsTree.set(tree);

        service.create.mockReturnValue(
        of({
            id: 2,
            userId: 7,
            restaurantId: 10,
            parentReviewId: 1,
            content: 'ciao',
            createdAt: '2025',
            updatedAt: '2025',
            upvotes: 0,
            downvotes: 0,
            user: null,
            restaurantName: null,
        })
        );

        service.getUserVote.mockReturnValue(of(1));

        comp.onReplyCreated({ parentId: 1, content: 'ciao' });

        const child = parent.replies[0];

        expect(child.id).toBe(2);
        expect(child.parentReviewId).toBe(1);
        expect(child.level).toBe(1);
        expect(child.user).toBeNull();
        expect(child.restaurantName).toBeNull();
    });

    it('in caso di successo, dovrebbe mappare correttamente i dati dell\'utente se presenti', () => {
        const parent = createReviewTree({ id: 1, level: 2 });
        const tree = [parent];

        comp.reviewsTree.set(tree);

        service.create.mockReturnValue(
        of({
            id: 3,
            userId: 5,
            restaurantId: 10,
            parentReviewId: 1,
            content: 'reply',
            createdAt: '2025',
            updatedAt: '2025',
            upvotes: 0,
            downvotes: 0,
            user: { username: 'alice', iconId: 4 },
            restaurantName: 'Test',
        })
        );

        service.getUserVote.mockReturnValue(of(-1));

        comp.onReplyCreated({ parentId: 1, content: 'reply' });

        const child = parent.replies[0];

        expect(child.user).toEqual({ username: 'alice', iconId: 4 });
        expect(child.restaurantName).toBe('Test');
        expect(child.maxSubtreeLevel).toBe(parent.level + 1);
    });

    it('in caso di successo, dovrebbe normalizzare parentReviewId a null se undefined', () => {
        const parent = createReviewTree({ id: 1, level: 0 });
        const tree = [parent];

        comp.reviewsTree.set(tree);

        service.create.mockReturnValue(
            of({
            id: 2,
            userId: 3,
            restaurantId: 10,
            parentReviewId: undefined,
            content: 'reply',
            createdAt: '2025',
            updatedAt: '2025',
            upvotes: 0,
            downvotes: 0,
            user: null,
            restaurantName: null,
            })
        );

        service.getUserVote.mockReturnValue(of(0));

        comp.onReplyCreated({ parentId: 1, content: 'reply' });

        const child = parent.replies[0];

        expect(child.parentReviewId).toBeNull();
    });

    it('dovrebbe assegnare userVote alla nuova risposta e aggiornare l\'albero', () => {
        const parent = createReviewTree({ id: 1, level: 0 });
        const tree = [parent];

        comp.reviewsTree.set(tree);

        service.create.mockReturnValue(
        of({
            id: 2,
            userId: 1,
            restaurantId: 10,
            parentReviewId: 1,
            content: 'reply',
            createdAt: '2025',
            updatedAt: '2025',
            upvotes: 0,
            downvotes: 0,
            user: null,
            restaurantName: null,
        })
        );

        service.getUserVote.mockReturnValue(of(1));

        comp.onReplyCreated({ parentId: 1, content: 'reply' });

        expect(parent.replies[0].userVote).toBe(1);
    });

    it('dovrebbe gestire gli errori durante la creazione della risposta', () => {
        const err = { message: 'errore create' };

        service.create.mockReturnValue(
        throwError(() => err)
        );

        comp.onReplyCreated({ parentId: 1, content: 'reply valida' });

        expect(comp['handleError']).toHaveBeenCalledWith(err);
    });
  });

  // ----------------------------------------------------------------
  describe('Aggiornamento recensione', () => {
    beforeEach(() => {
        vi.spyOn(comp as any, 'loadReviews').mockImplementation(() => {});
        vi.spyOn(comp as any, 'handleError').mockImplementation(() => {});
    });

    it('dovrebbe chiamare il servizio di update se il testo è valido', () => {
        service.update.mockReturnValue(of({}));

        comp.onReviewUpdated({ id: 1, content: 'aggiornata' });

        expect(service.update).toHaveBeenCalled();
    });

    it('non dovrebbe aggiornare se il testo è vuoto', () => {
        comp.onReviewUpdated({ id: 1, content: '    ' });

        expect(service.update).not.toHaveBeenCalled();
        expect(comp['loadReviews']).not.toHaveBeenCalled();
        expect(comp['handleError']).not.toHaveBeenCalled();
    });

    it('non dovrebbe aggiornare se il testo supera i 500 caratteri', () => {
        const long = 'a'.repeat(501);

        comp.onReviewUpdated({ id: 1, content: long });

        expect(service.update).not.toHaveBeenCalled();
        expect(comp['loadReviews']).not.toHaveBeenCalled();
        expect(comp['handleError']).not.toHaveBeenCalled();
    });

    it('dovrebbe gestire gli errori durante l\'aggiornamento', () => {
        const err = { message: 'errore update' };

        service.update.mockReturnValue(
        throwError(() => err)
        );

        comp.onReviewUpdated({ id: 5, content: 'test valido' });

        expect(service.update).toHaveBeenCalledWith({
        id: 5,
        content: 'test valido',
        });

        expect(comp['handleError']).toHaveBeenCalledWith(err);
        expect(comp['loadReviews']).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Cancellazione recensione', () => {
    beforeEach(() => {
        vi.spyOn(ReviewTreeViewModel.prototype, 'flattenTree')
        .mockImplementation((tree: ReviewTreeModel[]) => {
            const out: ReviewTreeModel[] = [];
            const walk = (n: ReviewTreeModel) => {
            out.push(n);
            n.replies.forEach(walk);
            };
            tree.forEach(walk);
            return out;
        });

        vi.spyOn(comp as any, 'handleError').mockImplementation(() => {});
    });

    it('in caso di successo, dovrebbe rimuovere una recensione root dall\'albero', () => {
        const r1 = createReviewTree({ id: 1 });
        const r2 = createReviewTree({ id: 2 });

        comp.reviewsTree.set([r1, r2]);

        service.delete.mockReturnValue(of(null));

        comp.onDeleteReview(1);

        expect(comp.reviewsTree()).toEqual([r2]);
    });

    it('non dovrebbe modificare l\'albero se il genitore di una recensione non root non viene trovato', () => {
        const child = createReviewTree({ id: 2, level: 1 });
        const root = createReviewTree({ id: 1, replies: [] });

        comp.reviewsTree.set([root]);

        service.delete.mockReturnValue(of(null));

        comp.onDeleteReview(2);

        expect(comp.reviewsTree()).toEqual([root]);
    });

    it('in caso di successo, dovrebbe rimuovere una recensione non root dal suo genitore', () => {
        const child1 = createReviewTree({ id: 2, level: 1 });
        const child2 = createReviewTree({ id: 3, level: 1 });

        const root = createReviewTree({
        id: 1,
        replies: [child1, child2],
        });

        comp.reviewsTree.set([root]);

        service.delete.mockReturnValue(of(null));

        comp.onDeleteReview(2);

        expect(root.replies.length).toBe(1);
        expect(root.replies[0].id).toBe(3);
        expect(comp.reviewsTree()).toEqual([root]);
    });

    it('dovrebbe gestire gli errori durante la cancellazione', () => {
        const err = { message: 'errore delete' };

        comp.reviewsTree.set([
        createReviewTree({ id: 1 }),
        ]);

        service.delete.mockReturnValue(
        throwError(() => err)
        );

        comp.onDeleteReview(1);

        expect(comp['handleError']).toHaveBeenCalledWith(err);
    });
  });

  // ----------------------------------------------------------------
  describe('Votazione recensione', () => {
    beforeEach(() => {
        vi.spyOn(ReviewTreeViewModel.prototype, 'flattenTree')
        .mockImplementation((tree: ReviewTreeModel[]) => {
            const out: ReviewTreeModel[] = [];
            const walk = (n: ReviewTreeModel) => {
            out.push(n);
            n.replies.forEach(walk);
            };
            tree.forEach(walk);
            return out;
        });

        vi.spyOn(comp as any, 'applyLocalVote').mockImplementation(() => {});
    });

    it('non dovrebbe fare nulla se il nodo da votare non viene trovato', () => {
        comp.reviewsTree.set([
        createReviewTree({ id: 1 }),
        ]);

        comp.onVote('up', 999);

        expect(service.voteReview).not.toHaveBeenCalled();
    });

    it('dovrebbe applicare un upvote ottimisticamente e aggiornare con i dati del backend', () => {
        const node = createReviewTree({
        id: 1,
        upvotes: 0,
        downvotes: 0,
        userVote: 0,
        });

        const tree = [node];
        comp.reviewsTree.set(tree);

        service.voteReview.mockReturnValue(
        of({ upvotes: 5, downvotes: 1 })
        );

        comp.onVote('up', 1);

        expect(comp['applyLocalVote']).toHaveBeenCalledWith(node, 1);

        expect(node.upvotes).toBe(5);
        expect(node.downvotes).toBe(1);
    });

    it('dovrebbe applicare un downvote ottimisticamente e aggiornare con i dati del backend', () => {
        const node = createReviewTree({
        id: 2,
        upvotes: 10,
        downvotes: 0,
        userVote: 0,
        });

        comp.reviewsTree.set([node]);

        service.voteReview.mockReturnValue(
        of({ upvotes: 10, downvotes: 3 })
        );

        comp.onVote('down', 2);

        expect(comp['applyLocalVote']).toHaveBeenCalledWith(node, -1);
        expect(node.upvotes).toBe(10);
        expect(node.downvotes).toBe(3);
    });

    it('dovrebbe fare il rollback dello stato in caso di errore del backend', () => {
        const node = createReviewTree({
        id: 3,
        upvotes: 2,
        downvotes: 1,
        userVote: 1,
        });

        comp.reviewsTree.set([node]);

        service.voteReview.mockReturnValue(
        throwError(() => new Error('errore voto'))
        );

        comp.onVote('down', 3);

        expect(node.userVote).toBe(1);
        expect(node.upvotes).toBe(2);
        expect(node.downvotes).toBe(1);
    });

    it('dovrebbe chiamare reviewsTree.set durante il rollback', () => {
        const node = createReviewTree({
        id: 4,
        upvotes: 1,
        downvotes: 0,
        userVote: 0,
        });

        const spySet = vi.spyOn(comp.reviewsTree, 'set');

        comp.reviewsTree.set([node]);

        service.voteReview.mockReturnValue(
        throwError(() => new Error('fail'))
        );

        comp.onVote('up', 4);

        expect(spySet).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('applyLocalVote (helper)', () => {
    it('dovrebbe annullare un upvote se si vota di nuovo up', () => {
        const node = createReviewTree({
        userVote: 1,
        upvotes: 5,
        downvotes: 2,
        });

        (comp as any).applyLocalVote(node, 1);

        expect(node.userVote).toBe(0);
        expect(node.upvotes).toBe(4);
        expect(node.downvotes).toBe(2);
    });

    it('dovrebbe annullare un downvote se si vota di nuovo down', () => {
        const node = createReviewTree({
        userVote: -1,
        upvotes: 3,
        downvotes: 6,
        });

        (comp as any).applyLocalVote(node, -1);

        expect(node.userVote).toBe(0);
        expect(node.downvotes).toBe(5);
        expect(node.upvotes).toBe(3);
    });

    it('dovrebbe applicare un upvote partendo da uno stato neutrale', () => {
        const node = createReviewTree({
        userVote: 0,
        upvotes: 1,
        downvotes: 0,
        });

        (comp as any).applyLocalVote(node, 1);

        expect(node.userVote).toBe(1);
        expect(node.upvotes).toBe(2);
        expect(node.downvotes).toBe(0);
    });

    it('dovrebbe applicare un downvote partendo da uno stato neutrale', () => {
        const node = createReviewTree({
        userVote: 0,
        upvotes: 2,
        downvotes: 1,
        });

        (comp as any).applyLocalVote(node, -1);

        expect(node.userVote).toBe(-1);
        expect(node.downvotes).toBe(2);
        expect(node.upvotes).toBe(2);
    });

    it('dovrebbe cambiare il voto da downvote a upvote', () => {
        const node = createReviewTree({
        userVote: -1,
        upvotes: 4,
        downvotes: 3,
        });

        (comp as any).applyLocalVote(node, 1);

        expect(node.userVote).toBe(1);
        expect(node.upvotes).toBe(5);
        expect(node.downvotes).toBe(2);
    });

    it('dovrebbe cambiare il voto da upvote a downvote', () => {
        const node = createReviewTree({
        userVote: 1,
        upvotes: 7,
        downvotes: 2,
        });

        (comp as any).applyLocalVote(node, -1);

        expect(node.userVote).toBe(-1);
        expect(node.downvotes).toBe(3);
        expect(node.upvotes).toBe(6);
    });
  });

  // ----------------------------------------------------------------
  describe('onOpenThread', () => {
    it('dovrebbe navigare al thread dalla pagina del ristorante', () => {
        const node = createReviewTree({ restaurantId: 10 });

        comp.startingReviewId = null;
        comp.onOpenThread(node);

        expect(router.navigate).toHaveBeenCalled();
    });

    it('dovrebbe navigare a un sotto-thread da una pagina thread', () => {
        const node = createReviewTree({ restaurantId: 10 });

        comp.startingReviewId = 5;
        comp.onOpenThread(node);

        expect(router.navigate).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('scrollToReview (helper)', () => {
    beforeEach(() => {
        vi.useFakeTimers();

        vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(cb => {
            cb();
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('dovrebbe scrollare all\'elemento se viene trovato subito', () => {
        const scrollSpy = vi.fn();

        vi.spyOn(document, 'getElementById').mockReturnValue({
        scrollIntoView: scrollSpy,
        } as any);

        (comp as any).scrollToReview(5);

        // esegue queueMicrotask + setTimeout
        vi.runAllTimers();

        expect(document.getElementById).toHaveBeenCalledWith('review-5');
        expect(scrollSpy).toHaveBeenCalledOnce();
    });

    it('dovrebbe scrollare all\'elemento dopo alcuni tentativi se non è subito presente', () => {
        const scrollSpy = vi.fn();

        const getElSpy = vi
        .spyOn(document, 'getElementById')
        .mockImplementationOnce(() => null)   // primo tentativo
        .mockImplementationOnce(() => null)   // secondo
        .mockImplementationOnce(() => ({
            scrollIntoView: scrollSpy,
        }) as any);                            // terzo: trovato

        (comp as any).scrollToReview(10);

        // avanza microtask + retry
        vi.runAllTimers();

        expect(getElSpy).toHaveBeenCalled();
        expect(scrollSpy).toHaveBeenCalledOnce();
    });

    it('non dovrebbe chiamare scrollIntoView se l\'elemento non viene mai trovato', () => {
        const getElSpy = vi
        .spyOn(document, 'getElementById')
        .mockReturnValue(null);

        (comp as any).scrollToReview(99);

        vi.runAllTimers();

        expect(getElSpy).toHaveBeenCalled();
    });

    it('non dovrebbe andare in loop infinito se l\'elemento non viene trovato', () => {
        const getElSpy = vi
        .spyOn(document, 'getElementById')
        .mockReturnValue(null);

        (comp as any).scrollToReview(42);

        vi.runAllTimers();

        // max 1 chiamata iniziale + retry (~10)
        expect(getElSpy.mock.calls.length).toBeLessThanOrEqual(12);
    });
  });
});
