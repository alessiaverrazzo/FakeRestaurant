import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import '@angular/compiler';

// Mock
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,

    Component: () => (cls: any) => cls,
    ViewChild: () => () => {},

    ElementRef: class {
      constructor(public nativeElement: any) {}
    },
    
    inject: vi.fn(() => ({})),
  };
});

// Mock IntersectionObserver globale
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

global.IntersectionObserver = vi.fn(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
})) as any;

import { NotificationPageComponent } from '@features/notifications/notification-page/views/notification-page.component';

// Mock viewmodel
function createVmMock() {
  return {
    loadFromBackend: vi.fn(),
    handleClick: vi.fn(),
    loadMore: vi.fn(),

    loading: vi.fn().mockReturnValue(false),
    visibleNotifications: vi.fn().mockReturnValue([]),
    groupedNotifications: vi.fn().mockReturnValue({}),
  };
}

describe('NotificationPageComponent', () => {
  let comp: NotificationPageComponent;
  let vm: any;

  beforeEach(() => {
    vi.useFakeTimers();

    vm = createVmMock();

    comp = new NotificationPageComponent() as any;
    (comp as any).vm = vm;

    // reset IntersectionObserver mock
    (global.IntersectionObserver as any).mockClear();
    mockObserve.mockClear();
    mockDisconnect.mockClear();

    document.body.classList.remove('notifications-page');
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.classList.remove('notifications-page');
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(comp).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('ngOnInit', () => {
    it("dovrebbe aggiungere la classe 'notifications-page' al body e chiamare vm.loadFromBackend", async () => {
      await comp.ngOnInit();

      expect(document.body.classList.contains('notifications-page')).toBe(true);
      expect(vm.loadFromBackend).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  describe('onNotificationClick', () => {
    it('dovrebbe delegare la gestione del click al viewmodel', () => {
      const n = { id: 123 } as any;

      comp.onNotificationClick(n);

      expect(vm.handleClick).toHaveBeenCalledWith(n);
    });
  });

  // ----------------------------------------------------------------
  describe('ngAfterViewInit', () => {
    it('non dovrebbe creare un IntersectionObserver se scrollAnchor non è definito', () => {
      comp.scrollAnchor = undefined;

      comp.ngAfterViewInit();
      vi.runAllTimers();

      expect(global.IntersectionObserver).not.toHaveBeenCalled();
    });

    it('dovrebbe creare e avviare un IntersectionObserver se scrollAnchor è definito', () => {
      comp.scrollAnchor = { nativeElement: {} } as any;

      comp.ngAfterViewInit();
      vi.runAllTimers();

      expect(global.IntersectionObserver).toHaveBeenCalledTimes(1);
      expect(mockObserve).toHaveBeenCalledTimes(1);
    });

    it("dovrebbe chiamare vm.loadMore quando l'elemento osservato diventa visibile", () => {
      comp.scrollAnchor = { nativeElement: {} } as any;

      comp.ngAfterViewInit();
      vi.runAllTimers();

      const callback = (global.IntersectionObserver as any).mock.calls[0][0];

      callback([{ isIntersecting: true }]);

      expect(vm.loadMore).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  describe('ngOnDestroy', () => {
    it("dovrebbe rimuovere la classe dal body e disconnettere l'observer se esiste", () => {
      comp.scrollAnchor = { nativeElement: {} } as any;

      comp.ngAfterViewInit();
      vi.runAllTimers();

      document.body.classList.add('notifications-page');

      comp.ngOnDestroy();

      expect(document.body.classList.contains('notifications-page')).toBe(false);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
