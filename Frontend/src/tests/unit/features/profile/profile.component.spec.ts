import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';

// Mock
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls
  };
});

// Mock viewmodel
function createVmMock() {
  return {
    loadProfile: vi.fn(),
  };
}

import { ProfileComponent } from '@features/profile/views/profile.component';

describe('ProfileComponent', () => {

  let comp: ProfileComponent;
  let vm: any;

  beforeEach(() => {
    vm = createVmMock();
    comp = new ProfileComponent(vm);
  });

  // ----------------------------------------------------------------
  describe('Costruzione', () => {
    it('dovrebbe assegnare la VM passata al costruttore', () => {
      expect(comp.vm).toBe(vm);
    });
  });

  // ----------------------------------------------------------------
  describe('ngOnInit', () => {
    it('dovrebbe chiamare vm.loadProfile() in ngOnInit', () => {
      comp.ngOnInit();

      expect(vm.loadProfile).toHaveBeenCalledTimes(1);
    });
  });
});
