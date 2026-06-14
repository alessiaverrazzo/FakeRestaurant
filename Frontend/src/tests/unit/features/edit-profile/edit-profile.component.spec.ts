import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';

// Mock decoratori
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Injectable: () => (cls: any) => cls
  };
});

import { EditProfileComponent } from '@features/edit-profile/views/edit-profile.component';

// Mock viewmodel
function createVmMock() {
  return {
    reset: vi.fn(),
    loadUser: vi.fn()
  };
}

describe('EditProfileComponent', () => {
  let component: EditProfileComponent;
  let vm: ReturnType<typeof createVmMock>;

  beforeEach(() => {
    vm = createVmMock();
    component = new EditProfileComponent(vm as any);
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(component).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('ngOnInit', () => {
    it('dovrebbe chiamare reset() e loadUser()', () => {
      component.ngOnInit();

      expect(vm.reset).toHaveBeenCalledTimes(1);
      expect(vm.loadUser).toHaveBeenCalledTimes(1);
    });
  });
});
