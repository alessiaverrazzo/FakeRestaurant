import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';

import { RestaurantService } from '@core/services/restaurant.service';
import type { RestaurantCardModel } from '@shared/components/restaurant-card/models/restaurant-card.model';
import type { RestaurantDetailModel } from '@features/restaurants/restaurant-detail/models/restaurant-detail.model';

// Mock HttpService
type HttpServiceMock = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Mock FormData (per testare create())
class TestFormData {
  entries: [string, any][] = [];

  append(key: string, value: any) {
    this.entries.push([key, value]);
  }
}

(globalThis as any).FormData = TestFormData as any;

describe('RestaurantService — test principali', () => {
  let service: RestaurantService;
  let http: HttpServiceMock;

  beforeEach(() => {
    http = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };

    service = new RestaurantService(http as any);
  });

  // ----------------------------------------------------------------
  describe('validateId', () => {
    it('accetta numeri positivi e stringhe numeriche', () => {
      const validateId = (service as any).validateId.bind(service);
      expect(validateId(1)).toBe(1);
      expect(validateId('5')).toBe(5);
    });

    it('rifiuta 0, negativi e valori non numerici', () => {
      const validateId = (service as any).validateId.bind(service);

      const invalidValues = [0, -1, -10, 'abc', NaN, null, undefined];

      invalidValues.forEach(v => {
        expect(() => validateId(v)).toThrow('Invalid ID');
      });
    });
  });

  // ----------------------------------------------------------------
  describe('sanitizeText', () => {
    it('trimma, rimuove < > e taglia alla lunghezza massima', () => {
      const sanitizeText = (service as any).sanitizeText.bind(service);
      const input = '   <ciao> questo è un testo   ';
      const res = sanitizeText(input, 10);
      expect(res).toBe('ciao quest');
    });

    it('ritorna stringa vuota per null/undefined/empty', () => {
      const sanitizeText = (service as any).sanitizeText.bind(service);
      expect(sanitizeText('', 50)).toBe('');
      expect(sanitizeText(null, 50)).toBe('');
      expect(sanitizeText(undefined, 50)).toBe('');
    });

    it('non inserisce caratteri strani, solo rimuove < >', () => {
      const sanitizeText = (service as any).sanitizeText.bind(service);
      const input = '<b>Test</b>';
      const res = sanitizeText(input, 50);
      expect(res).toBe('bTest/b');
    });
  });

  // ----------------------------------------------------------------
  describe('sanitizeQuery', () => {
    it('trimma, rimuove caratteri non permessi e taglia a 100', () => {
      const sanitizeQuery = (service as any).sanitizeQuery.bind(service);
      const input = "   Ciao!! Ristorante $$$ Prova ###   ";
      const res = sanitizeQuery(input);
      expect(res).toBe('Ciao Ristorante  Prova ');
      expect(res.length).toBeLessThanOrEqual(100);
    });

    it('ritorna stringa vuota per null/undefined/empty', () => {
      const sanitizeQuery = (service as any).sanitizeQuery.bind(service);
      expect(sanitizeQuery('')).toBe('');
      expect(sanitizeQuery(null)).toBe('');
      expect(sanitizeQuery(undefined)).toBe('');
    });
  });

  // ----------------------------------------------------------------
  describe('validateCoords', () => {
    it('accetta valori numerici o stringhe numeriche', () => {
      const validateCoords = (service as any).validateCoords.bind(service);
      const res = validateCoords('40.5', '14.3');
      expect(res).toEqual({ lat: 40.5, lng: 14.3 });
    });

    it('lancia errore per valori non numerici', () => {
      const validateCoords = (service as any).validateCoords.bind(service);

      expect(() => validateCoords('abc', 10)).toThrow('Invalid coordinates');
      expect(() => validateCoords(10, 'xyz')).toThrow('Invalid coordinates');
      expect(() => validateCoords(NaN, 10)).toThrow('Invalid coordinates');
    });
  });

  // ----------------------------------------------------------------
  describe('validateRadius', () => {
    it('ritorna 5 se non è un numero finito', () => {
      const validateRadius = (service as any).validateRadius.bind(service);
      expect(validateRadius(NaN)).toBe(5);
      expect(validateRadius('abc')).toBe(5);
    });

    it('clampa il raggio tra 1 e 50', () => {
      const validateRadius = (service as any).validateRadius.bind(service);
      expect(validateRadius(-10)).toBe(1);
      expect(validateRadius(0)).toBe(1);
      expect(validateRadius(100)).toBe(50);
      expect(validateRadius(10)).toBe(10);
    });
  });

  // ----------------------------------------------------------------
  describe('safeMapCard', () => {
    it('mappa correttamente un DTO completo', () => {
      const dto = {
        id: '10',
        name: '<Risto> Prova',
        description: '  Descrizione <script>cattiva</script>  ',
        image_url: 'image.jpg',
        upvotes: '5',
        downvotes: 2,
        latitude: '40.1',
        longitude: 14.2
      };

      const card = (service as any).safeMapCard(dto) as RestaurantCardModel;

      expect(card).toEqual({
        id: 10,
        name: 'Risto Prova',
        description: 'Descrizione scriptcattiva/script',
        imageUrl: 'http://localhost:3000/uploads/image.jpg',
        upvotes: 5,
        downvotes: 2,
        latitude: 40.1,
        longitude: 14.2
      });
    });

    it('gestisce valori mancanti con fallback', () => {
      const dto = {
        id: undefined,
        name: undefined,
        description: undefined,
        image_url: null,
        upvotes: undefined,
        downvotes: undefined,
        latitude: undefined,
        longitude: undefined
      };

      const card = (service as any).safeMapCard(dto) as RestaurantCardModel;

      expect(card).toEqual({
        id: 0,
        name: '',
        description: '',
        imageUrl: null,
        upvotes: 0,
        downvotes: 0,
        latitude: 0,
        longitude: 0
      });
    });
  });

  // ----------------------------------------------------------------
  describe('safeMapDetail', () => {
    it('mappa correttamente un DTO completo', () => {
      const dto = {
        id: '1',
        user_id: '2',
        name: '<Risto> Dettaglio',
        description: ' <b>Desc</b> ',
        image_url: 'img.png',
        latitude: '40.7',
        longitude: '14.8',
        created_at: '2025-01-01T10:00:00.000Z',
        upvotes: '10',
        downvotes: '3',
        username: '<Mario>',
        icon_id: '7'
      };

      const detail = (service as any).safeMapDetail(dto) as RestaurantDetailModel;

      expect(detail).toEqual({
        id: 1,
        userId: 2,
        name: 'Risto Dettaglio',
        description: 'bDesc/b',
        imageUrl: 'http://localhost:3000/uploads/img.png',
        latitude: 40.7,
        longitude: 14.8,
        createdAt: '2025-01-01T10:00:00.000Z',
        upvotes: 10,
        downvotes: 3,
        username: 'Mario',
        iconId: 7
      });
    });

    it('gestisce valori mancanti con fallback sensati', () => {
      const dto = {
        id: undefined,
        user_id: undefined,
        name: undefined,
        description: undefined,
        image_url: null,
        latitude: '0',
        longitude: '0',
        created_at: undefined,
        upvotes: undefined,
        downvotes: undefined,
        username: undefined,
        icon_id: undefined
      };

      const detail = (service as any).safeMapDetail(dto) as RestaurantDetailModel;

      expect(detail).toEqual({
        id: 0,
        userId: 0,
        name: '',
        description: '',
        imageUrl: null,
        latitude: 0,
        longitude: 0,
        createdAt: null as any,
        upvotes: 0,
        downvotes: 0,
        username: '',
        iconId: 0
      });
    });
  });

  // ----------------------------------------------------------------
  describe('getAll', () => {
    it('deve chiamare http.get("restaurants") e mappare i risultati', () => {
      const apiResponse = [
        { id: 1, name: 'A', description: 'x', image_url: null, upvotes: 1, downvotes: 0, latitude: 10, longitude: 20 },
        { id: 2, name: 'B', description: 'y', image_url: 'img.jpg', upvotes: 5, downvotes: 2, latitude: 11, longitude: 21 }
      ];

      http.get.mockReturnValue(of(apiResponse));

      let result: RestaurantCardModel[] = [];

      service.getAll().subscribe(cards => (result = cards));

      expect(http.get).toHaveBeenCalledWith('restaurants');
      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[1].imageUrl).toBe('http://localhost:3000/uploads/img.jpg');
    });
  });

  // ----------------------------------------------------------------
  describe('getById', () => {
    it('deve validare l\'id, chiamare http.get e mappare il risultato', () => {
      const apiDetail = {
        id: 1,
        user_id: 2,
        name: 'R',
        description: 'D',
        image_url: null,
        latitude: 10,
        longitude: 20,
        created_at: '2025-01-01T10:00:00.000Z',
        upvotes: 5,
        downvotes: 1,
        username: 'User',
        icon_id: 3
      };

      http.get.mockReturnValue(of(apiDetail));

      let detail!: RestaurantDetailModel;

      service.getById(1).subscribe(d => (detail = d));

      expect(http.get).toHaveBeenCalledWith('restaurants/1');
      expect(detail.id).toBe(1);
      expect(detail.userId).toBe(2);
    });

    it('deve lanciare per id non valido e non chiamare http.get', () => {
      expect(() => service.getById(0 as any)).toThrow('Invalid ID');
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('create', () => {
    it('deve costruire un FormData corretto (con immagine) e mappare il risultato', () => {
      const fakeFile = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });

      const apiDetail = {
        id: 1,
        user_id: 10,
        name: 'R',
        description: 'D',
        image_url: 'photo.jpg',
        latitude: 40,
        longitude: 15,
        created_at: '2025-01-01T10:00:00.000Z',
        upvotes: 0,
        downvotes: 0,
        username: 'Owner',
        icon_id: 2
      };

      http.post.mockReturnValue(of(apiDetail));

      let detail!: RestaurantDetailModel;

      service
        .create({
          name: '  <Risto>  ',
          description: '  <b>Desc</b>  ',
          latitude: 40,
          longitude: 15,
          imageFile: fakeFile
        })
        .subscribe(d => (detail = d));

      expect(http.post).toHaveBeenCalledTimes(1);
      const [endpoint, body] = http.post.mock.calls[0];

      expect(endpoint).toBe('restaurants');
      expect(body).toBeInstanceOf(TestFormData);

      const fdEntries = (body as TestFormData).entries;
      const map = Object.fromEntries(fdEntries);

      expect(map['name']).toBe('Risto');
      expect(map['description']).toBe('bDesc/b');
      expect(map['latitude']).toBe('40');
      expect(map['longitude']).toBe('15');
      expect(map['image']).toBe(fakeFile);

      expect(detail.imageUrl).toBe('http://localhost:3000/uploads/photo.jpg');
    });

    it('non deve inserire image se imageFile è null/undefined', () => {
      const apiDetail = {
        id: 1,
        user_id: 10,
        name: 'R',
        description: 'D',
        image_url: null,
        latitude: 40,
        longitude: 15,
        created_at: '2025-01-01T10:00:00.000Z',
        upvotes: 0,
        downvotes: 0,
        username: 'Owner',
        icon_id: 2
      };

      http.post.mockReturnValue(of(apiDetail));

      service
        .create({
          name: 'R',
          description: 'D',
          latitude: 40,
          longitude: 15,
          imageFile: null
        })
        .subscribe();

      const [, body] = http.post.mock.calls[0];
      const fdEntries = (body as TestFormData).entries;
      const keys = fdEntries.map(([k]) => k);

      expect(keys).not.toContain('image');
    });

    it('deve lanciare se le coordinate sono invalide e non chiamare http.post', () => {
      expect(() =>
        service.create({
          name: 'R',
          description: 'D',
          latitude: NaN,
          longitude: 15,
          imageFile: null
        })
      ).toThrow('Invalid coordinates');

      expect(http.post).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('update', () => {
    it('deve validare l\'id, sanificare i campi e chiamare http.put', () => {
      const apiDetail = {
        id: 1,
        user_id: 2,
        name: 'New',
        description: 'New desc',
        image_url: null,
        latitude: 10,
        longitude: 20,
        created_at: '2025-01-01T10:00:00.000Z',
        upvotes: 1,
        downvotes: 0,
        username: 'Owner',
        icon_id: 2
      };

      http.put.mockReturnValue(of(apiDetail));

      let detail!: RestaurantDetailModel;

      service
        .update(1, {
          name: '  <Nuovo>  ',
          description: ' <b>Nuova</b> '
        })
        .subscribe(d => (detail = d));

      expect(http.put).toHaveBeenCalledTimes(1);
      const [endpoint, payload] = http.put.mock.calls[0];

      expect(endpoint).toBe('restaurants/1');
      expect(payload).toEqual({
        id: 1,
        name: 'Nuovo',
        description: 'bNuova/b'
      });

      expect(detail.id).toBe(1);
      expect(detail.name).toBe('New');
    });

    it('con solo id (nessun campo modificato) deve inviare payload solo con id', () => {
      const apiDetail = {
        id: 2,
        user_id: 1,
        name: 'R',
        description: 'D',
        image_url: null,
        latitude: 0,
        longitude: 0,
        created_at: '2025-01-01T10:00:00.000Z',
        upvotes: 0,
        downvotes: 0,
        username: 'U',
        icon_id: 1
      };

      http.put.mockReturnValue(of(apiDetail));

      service.update(2, {}).subscribe();

      const [endpoint, payload] = http.put.mock.calls[0];

      expect(endpoint).toBe('restaurants/2');
      expect(payload).toEqual({ id: 2 });
    });

    it('deve lanciare per id non valido e non chiamare http.put', () => {
      expect(() => service.update(0 as any, { name: 'x' })).toThrow('Invalid ID');
      expect(http.put).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('delete', () => {
    it('deve validare l\'id e chiamare http.delete', () => {
      http.delete.mockReturnValue(of(void 0));

      let completed = false;

      service.delete(5).subscribe(() => {
        completed = true;
      });

      expect(completed).toBe(true);
      expect(http.delete).toHaveBeenCalledWith('restaurants/5');
    });

    it('deve lanciare per id non valido e non chiamare http.delete', () => {
      expect(() => service.delete(-1 as any)).toThrow('Invalid ID');
      expect(http.delete).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('getMyRestaurants', () => {
    it('deve chiamare http.get("restaurants/my-restaurants") e mappare i risultati', () => {
      http.get.mockReturnValue(
        of([
          { id: 1, name: 'My Risto', description: 'D', image_url: null, upvotes: 1, downvotes: 0, latitude: 1, longitude: 2 }
        ])
      );

      let cards: RestaurantCardModel[] = [];

      service.getMyRestaurants().subscribe(c => (cards = c));

      expect(http.get).toHaveBeenCalledWith('restaurants/my-restaurants');
      expect(cards.length).toBe(1);
      expect(cards[0].name).toBe('My Risto');
    });
  });

  // ----------------------------------------------------------------
  describe('searchByName', () => {
    it('deve sanificare la query e chiamare http.get con query encodata', () => {
      http.get.mockReturnValue(of([]));

      service.searchByName('  Ciao!! Ristò ###  ').subscribe();

      expect(http.get).toHaveBeenCalledTimes(1);
      const [endpoint] = http.get.mock.calls[0];

      expect(endpoint).toBe(
        'restaurants/search?query=' + encodeURIComponent('Ciao Ristò ')
      );
    });

    it('con query vuota deve comunque chiamare l\'endpoint con query vuota', () => {
      http.get.mockReturnValue(of([]));

      service.searchByName('   ').subscribe();

      const [endpoint] = http.get.mock.calls[0];
      expect(endpoint).toBe('restaurants/search?query=' + encodeURIComponent(''));
    });
  });

  // ----------------------------------------------------------------
  describe('searchByPosition', () => {
    it('deve validare lat/lng, clamping del radius e chiamare http.get', () => {
      http.get.mockReturnValue(of([]));

      service.searchByPosition('40.5' as any, '14.2' as any, 100).subscribe();

      expect(http.get).toHaveBeenCalledTimes(1);
      const [endpoint] = http.get.mock.calls[0];

      expect(endpoint).toBe('restaurants/nearby?lat=40.5&lng=14.2&radius=50');
    });

    it('deve lanciare per coordinate invalide e non chiamare http.get', () => {
      expect(() => service.searchByPosition('abc' as any, 10 as any, 5)).toThrow('Invalid coordinates');
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('getTop / getFlop', () => {
    it('getTop deve chiamare /restaurants/top e mappare i risultati', () => {
      http.get.mockReturnValue(
        of([{ id: 1, name: 'Top', description: '', image_url: null, upvotes: 10, downvotes: 1, latitude: 0, longitude: 0 }])
      );

      let out: RestaurantCardModel[] = [];

      service.getTop().subscribe(r => (out = r));

      expect(http.get).toHaveBeenCalledWith('restaurants/top');
      expect(out[0].name).toBe('Top');
    });

    it('getFlop deve chiamare /restaurants/flop e mappare i risultati', () => {
      http.get.mockReturnValue(
        of([{ id: 2, name: 'Flop', description: '', image_url: null, upvotes: 0, downvotes: 5, latitude: 0, longitude: 0 }])
      );

      let out: RestaurantCardModel[] = [];

      service.getFlop().subscribe(r => (out = r));

      expect(http.get).toHaveBeenCalledWith('restaurants/flop');
      expect(out[0].name).toBe('Flop');
    });
  });

  // ----------------------------------------------------------------
  describe('voteRestaurant', () => {
    it('deve validare id, chiamare votesRestaurant e poi getById', () => {
      const apiDetail = {
        id: 1,
        user_id: 2,
        name: 'R',
        description: 'D',
        image_url: null,
        latitude: 10,
        longitude: 20,
        created_at: '2025-01-01T10:00:00.000Z',
        upvotes: 5,
        downvotes: 1,
        username: 'U',
        icon_id: 2
      };

      http.post.mockReturnValue(of({ ok: true }));
      http.get.mockReturnValue(of(apiDetail));

      let detail!: RestaurantDetailModel;

      service.voteRestaurant(1, 1).subscribe(d => (detail = d));

      expect(http.post).toHaveBeenCalledWith('votesRestaurant', {
        restaurant_id: 1,
        vote: 1
      });
      expect(detail.id).toBe(1);
    });

    it('deve lanciare per id non valido e non chiamare http.post', () => {
      expect(() => service.voteRestaurant(0 as any, 1)).toThrow('Invalid ID');
      expect(http.post).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('getUserVote', () => {
    it('deve validare id e chiamare http.get', () => {
      http.get.mockReturnValue(of({ vote: 1 }));

      let result: 1 | -1 | 0 | null = null;

      service.getUserVote(3).subscribe(v => (result = v));

      expect(http.get).toHaveBeenCalledWith('votesRestaurant/user/3');
      expect(result).toBe(1);
    });

    it('ritorna 0 se risposta vuota o malformata', () => {
      http.get.mockReturnValue(of(null));

      let result: any = null;
      service.getUserVote(3).subscribe(v => (result = v));
      expect(result).toBe(0);
    });

    it('ritorna 1 se vote === 1, altrimenti -1 per qualsiasi altro numero', () => {
      http.get.mockReturnValueOnce(of({ vote: 1 }));
      let r1: any = null;
      service.getUserVote(1).subscribe(v => (r1 = v));
      expect(r1).toBe(1);

      http.get.mockReturnValueOnce(of({ vote: -1 }));
      let r2: any = null;
      service.getUserVote(1).subscribe(v => (r2 = v));
      expect(r2).toBe(-1);

      http.get.mockReturnValueOnce(of({ vote: 0 }));
      let r3: any = null;
      service.getUserVote(1).subscribe(v => (r3 = v));
      expect(r3).toBe(-1);
    });

    it('deve lanciare per id non valido e non chiamare http.get', () => {
      expect(() => service.getUserVote(-5 as any)).toThrow('Invalid ID');
      expect(http.get).not.toHaveBeenCalled();
    });
  });
});
