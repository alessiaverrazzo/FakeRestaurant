import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import '@angular/compiler';
import { of, throwError } from 'rxjs';

// Mock
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    ViewChild: () => () => {},
    ElementRef: class { constructor(public nativeElement: any) {} },

    inject: vi.fn(() => ({})),
  };
});

import { AddRestaurantModalComponent } from '@features/restaurants/add-restaurant-modal/views/add-restaurant-modal.component';

// Mock viewmodel
function createVmMock() {
  return {
    form: {
      invalid: true,
      markAllAsTouched: vi.fn(),
      value: {}
    },

    loading: vi.fn(() => false),
    errorMessage: vi.fn(() => null),
    successMessage: vi.fn(() => null),
    imagePreview: vi.fn(() => null),
    imageFile: vi.fn(() => null),

    setLocation: vi.fn(),
    setImageFile: vi.fn(),
    setImagePreview: vi.fn(),

    clearError: vi.fn(),
    setError: vi.fn(),
    clearSuccess: vi.fn(),
    setLoading: vi.fn(),
    setSuccess: vi.fn(),
    buildPayload: vi.fn(),
  };
}

// Mock RestaurantService
function createServiceMock() {
  return {
    create: vi.fn()
  };
}

describe('AddRestaurantModalComponent', () => {

  let comp: AddRestaurantModalComponent;
  let vm: any;
  let service: any;

  beforeEach(() => {
    vi.useFakeTimers();

    vm = createVmMock();
    service = createServiceMock();

    comp = new AddRestaurantModalComponent() as any;

    (comp as any).vm = vm;
    (comp as any).restaurantService = service;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ----------------------------------------------------------------
  describe('onLocationSelected', () => {
    it('dovrebbe chiamare vm.setLocation con le coordinate ricevute', () => {
      comp.onLocationSelected({ lat: 10, lng: 20 });

      expect(vm.setLocation).toHaveBeenCalledWith(10, 20);
    });
  });

  // ----------------------------------------------------------------
  describe('onImageSelected', () => {
    it('dovrebbe resettare immagine e anteprima se non viene selezionato nessun file', () => {
      const event = { target: { files: null } } as any;

      comp.onImageSelected(event);

      expect(vm.setImageFile).toHaveBeenCalledWith(null);
      expect(vm.setImagePreview).toHaveBeenCalledWith(null);
    });

    it("dovrebbe impostare il file e generare l'anteprima quando un file viene selezionato", () => {
      const fakeFile = new File(['abc'], 'img.png', { type: 'image/png' });
      const event = { target: { files: [fakeFile] } } as any;

      class MockFileReader {
          public result: string | ArrayBuffer | null = null;
          public onload: ((ev: any) => void) | null = null;

          readAsDataURL(_file: any) {
          this.result = 'data:image/png;base64,FAKE_DATA';
          if (this.onload) {
              this.onload({ target: { result: this.result } });
          }
          }
      }

      vi.stubGlobal('FileReader', MockFileReader as any);

      comp.onImageSelected(event);

      expect(vm.setImageFile).toHaveBeenCalledWith(fakeFile);
      
      expect(vm.setImagePreview).toHaveBeenCalledWith('data:image/png;base64,FAKE_DATA');
    });
  });

  // ----------------------------------------------------------------
  describe('removeImage', () => {
    it("dovrebbe resettare il file e l'anteprima dell'immagine", () => {
      comp.removeImage();

      expect(vm.setImageFile).toHaveBeenCalledWith(null);
      expect(vm.setImagePreview).toHaveBeenCalledWith(null);
    });
  });

  // ----------------------------------------------------------------
  describe('onSubmit', () => {
    it('dovrebbe marcare il form come touched e non procedere se invalido', () => {
      vm.form.invalid = true;

      comp.onSubmit();

      expect(vm.form.markAllAsTouched).toHaveBeenCalled();
      expect(service.create).not.toHaveBeenCalled();
    });

    it('in caso di successo, dovrebbe mostrare un messaggio, emettere save e close', () => {
      vm.form.invalid = false;
      vm.buildPayload.mockReturnValue({});
      service.create.mockReturnValue(of({ id: 123 }));

      const saveSpy = vi.spyOn(comp.save, 'emit');
      const closeSpy = vi.spyOn(comp.close, 'emit');

      comp.onSubmit();

      expect(vm.clearError).toHaveBeenCalled();
      expect(vm.setLoading).toHaveBeenCalledWith(true);

      vi.advanceTimersByTime(1500);

      expect(vm.setLoading).toHaveBeenCalledWith(false);
      expect(vm.setSuccess).toHaveBeenCalledWith('Ristorante inserito con successo!');
      expect(saveSpy).toHaveBeenCalledWith({ createdRestaurantId: 123 });
      expect(closeSpy).toHaveBeenCalled();
    });

    it('in caso di errore, dovrebbe mostrare il messaggio da err.error.message', () => {
      vm.form.invalid = false;
      vm.buildPayload.mockReturnValue({});

      service.create.mockReturnValue(
        throwError(() => ({ error: { message: 'ERR SPECIFICO' } }))
      );

      comp.onSubmit();

      expect(vm.setError).toHaveBeenCalledWith('ERR SPECIFICO');
    });

    it('in caso di errore, dovrebbe mostrare il messaggio da err.message', () => {
      vm.form.invalid = false;
      vm.buildPayload.mockReturnValue({});

      service.create.mockReturnValue(
        throwError(() => ({ message: 'GENERIC ERR' }))
      );

      comp.onSubmit();

      expect(vm.setError).toHaveBeenCalledWith('GENERIC ERR');
    });

    it('in caso di errore, dovrebbe mostrare un messaggio di fallback', () => {
      vm.form.invalid = false;
      vm.buildPayload.mockReturnValue({});

      service.create.mockReturnValue(
        throwError(() => ({ foo: 'bar' }))
      );

      comp.onSubmit();

      expect(vm.setError).toHaveBeenCalledWith(
        'Errore durante la creazione del ristorante.'
      );
    });
  });
});
