import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { PasswordResetGuard } from '@core/guards/password-reset.guard';

export const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/views/home.component')
        .then(m => m.HomeComponent)
  },

  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/access-denied/views/access-denied.component')
        .then(c => c.AccessDeniedComponent)
  },


  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/profile/views/profile.component')
        .then(m => m.ProfileComponent),
  },

  {
    path: 'restaurants/:id',
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    loadComponent: () =>
      import('./features/restaurants/restaurant-detail/views/restaurant-detail.component')
        .then(m => m.RestaurantDetailComponent),
  },

  {
    path: 'restaurants/:restaurantId/review-thread/:reviewId',
    loadComponent: () =>
      import('./features/reviews/review-tree/views/review-thread-page/review-thread-page.component')
        .then(m => m.ReviewThreadPageComponent),
  },

  {
    path: 'search',
    loadComponent: () =>
      import('./features/search-results/views/search-results-page.component')
        .then(m => m.SearchResultsPageComponent)
  },

  {
    path: 'edit-profile',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/edit-profile/views/edit-profile.component')
        .then(m => m.EditProfileComponent),
  },
  
  {
    path: 'reset-password/:token',
    canActivate: [PasswordResetGuard],
    loadComponent: () =>
      import('./features/auth/password-reset/views/password-reset.component')
        .then(m => m.PasswordResetComponent)
  },

  {
    path: 'notifications',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/notifications/notification-page/views/notification-page.component')
        .then(m => m.NotificationPageComponent)
  },

  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found.component')
        .then(m => m.NotFoundComponent),
  },
];
