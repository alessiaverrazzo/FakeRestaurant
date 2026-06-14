import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';

// Mock
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,

    Injectable: () => (cls: any) => cls,

    signal: actual.signal,
    computed: actual.computed,
  };
});

import { AddRestaurantModalViewModel } from '@features/restaurants/add-restaurant-modal/viewmodels/add-restaurant-modal.viewmodel';

describe('AddRestaurantModalViewModel', () => {

  let vm: AddRestaurantModalViewModel;

  beforeEach(() => {
    vm = new AddRestaurantModalViewModel();
  });

  // ----------------------------------------------------------------
  describe('Stato iniziale', () => {
    it('dovrebbe avere segnali con valori iniziali corretti', () => {
      expect(vm.loading()).toBe(false);
      expect(vm.errorMessage()).toBe(null);
      expect(vm.successMessage()).toBe(null);
      expect(vm.imagePreview()).toBe(null);
      expect(vm.imageFile()).toBe(null);
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione stato', () => {
    it('setImageFile e setImagePreview dovrebbero aggiornare i segnali corrispondenti', () => {
      const file = new File(['x'], 'a.png');
      vm.setImageFile(file);
      vm.setImagePreview('url');

      expect(vm.imageFile()).toBe(file);
      expect(vm.imagePreview()).toBe('url');
    });

    it('setSuccess e clearSuccess dovrebbero gestire il messaggio di successo', () => {
      vm.setSuccess('ok');
      expect(vm.successMessage()).toBe('ok');

      vm.clearSuccess();
      expect(vm.successMessage()).toBe(null);
    });

    it('setError e clearError dovrebbero gestire il messaggio di errore', () => {
      vm.setError('err');
      expect(vm.errorMessage()).toBe('err');

      vm.clearError();
      expect(vm.errorMessage()).toBe(null);
    });

    it('setLoading dovrebbe aggiornare lo stato di caricamento', () => {
      vm.setLoading(true);
      expect(vm.loading()).toBe(true);

      vm.setLoading(false);
      expect(vm.loading()).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('Form', () => {
    // ----------------------------------------------------------------
    describe('setLocation', () => {
      it('dovrebbe impostare latitudine e longitudine nel form', () => {
        vm.setLocation(10, 20);
        expect(vm.form.value.latitude).toBe(10);
        expect(vm.form.value.longitude).toBe(20);
      });
    });

    // ----------------------------------------------------------------
    describe('getErrorMessage', () => {
      it("dovrebbe ritornare il messaggio per 'required'", () => {
        const ctrl = vm.form.get('name')!;
        ctrl.setErrors({ required: true });
        expect(vm.getErrorMessage('name')).toBe('Campo obbligatorio');
      });

      it("dovrebbe ritornare il messaggio per 'maxlength'", () => {
        const ctrl = vm.form.get('description')!;
        ctrl.setErrors({ maxlength: true });
        expect(vm.getErrorMessage('description')).toBe('Hai superato il limite di caratteri');
      });

      it('dovrebbe ritornare null se non ci sono errori', () => {
        const ctrl = vm.form.get('description')!;
        ctrl.setErrors(null);
        expect(vm.getErrorMessage('description')).toBe(null);
      });

      it('dovrebbe ritornare null per errori non gestiti', () => {
        const ctrl = vm.form.get('name')!;
        ctrl.setErrors({ custom: true });

        expect(vm.getErrorMessage('name')).toBeNull();
      });
    });

    // ----------------------------------------------------------------
    describe('showError', () => {
      it('dovrebbe ritornare true se il campo è touched e invalido', () => {
        const ctrl = vm.form.get('name')!;
        ctrl.setErrors({ required: true });
        ctrl.markAsTouched();
        expect(vm.showError('name')).toBe(true);
      });

      it('dovrebbe ritornare false se il campo non è touched', () => {
        const ctrl = vm.form.get('name')!;
        ctrl.setErrors({ required: true });
        expect(vm.showError('name')).toBe(false);
      });
    });

    // ----------------------------------------------------------------
    describe('buildPayload', () => {
      it('dovrebbe costruire il payload corretto con valori validi', () => {
        vm.form.setValue({
          name: ' Pizza ',
          description: ' Buona ',
          latitude: 10,
          longitude: 20,
        });

        const file = new File(['x'], 'a.png');
        vm.setImageFile(file);

        const payload = vm.buildPayload();

        expect(payload).toEqual({
          name: 'Pizza',
          description: 'Buona',
          latitude: 10,
          longitude: 20,
          imageFile: file
        });
      });

      it('dovrebbe usare stringhe vuote come fallback per nome e descrizione nulli', () => {
        // lasciamo name/description a null/undefined usando patchValue
        vm.form.patchValue({
          name: null as any,
          description: undefined as any,
          latitude: 10,
          longitude: 20,
        });

        const payload = vm.buildPayload();

        expect(payload.name).toBe('');
        expect(payload.description).toBe('');
        expect(payload.latitude).toBe(10);
        expect(payload.longitude).toBe(20);
        expect(payload.imageFile).toBeNull();
      });
    });
  });
});
