import UserService from '../../../src/services/UserService';
import UserRepository from '../../../src/repositories/UserRepository';
import PasswordResetRepository from '../../../src/repositories/PasswordResetRepository';
import { hashPassword } from '../../../src/utils/hash';
import { sendEmail } from '../../../src/utils/email';

// Mock moduli esterni
jest.mock('../../../src/repositories/UserRepository');
jest.mock('../../../src/repositories/PasswordResetRepository');
jest.mock('../../../src/utils/hash');
jest.mock('../../../src/utils/email');

describe('UserService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('dovrebbe registrare correttamente un nuovo utente', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (UserRepository.create as jest.Mock).mockResolvedValue({ id: 1 });

      const user = {
        username: 'test',
        email: 'test@example.com',
        password: '12345678'
      } as any;

      const res = await UserService.register(user);

      expect(res.id).toBe(1);
      expect(hashPassword).toHaveBeenCalled();
    });

    it('dovrebbe lanciare un errore se mancano campi obbligatori', async () => {
      await expect(
        UserService.register({ username: '', email: 'a', password: '' } as any)
      ).rejects.toThrow('Compilare tutti i campi richiesti');
    });

    it('dovrebbe lanciare un errore se lo username è troppo corto', async () => {
      const user = { username: 'a', email: 'a@a.com', password: '12345678' } as any;

      await expect(UserService.register(user))
        .rejects.toThrow('Lo username deve essere di almeno 3 caratteri');
    });

    it('dovrebbe lanciare un errore se l\'email non è valida', async () => {
      const user = { username: 'test', email: 'invalid', password: '12345678' } as any;

      await expect(UserService.register(user))
        .rejects.toThrow('Formato email non valido');
    });

    it('dovrebbe lanciare un errore se l\'email è già in uso', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue({ id: 1 });

      await expect(
        UserService.register({ username: 'test', email: 'x@x.com', password: '12345678' } as any)
      ).rejects.toThrow('Email già in uso');
    });

    it('dovrebbe lanciare un errore se lo username è già in uso', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue({ id: 2 });

      await expect(
        UserService.register({ username: 'test', email: 'x@x.com', password: '12345678' } as any)
      ).rejects.toThrow('Username già in uso');
    });

    it('dovrebbe lanciare un errore se la password è troppo corta (< 8)', async () => {
      await expect(
        UserService.register({
          username: 'validname',
          email: 'test@example.com',
          password: '123'
        } as any)
      ).rejects.toThrow('La password deve essere di almeno 8 caratteri');
    });

    it('dovrebbe lanciare un errore se la password è troppo lunga (> 100)', async () => {
      const longPwd = 'a'.repeat(101);

      await expect(
        UserService.register({
          username: 'validname',
          email: 'test@example.com',
          password: longPwd
        } as any)
      ).rejects.toThrow('Password troppo lunga');
    });

  });

  describe('login', () => {
    it('dovrebbe effettuare il login correttamente tramite email', async () => {
      const fakeUser = { id: 1, checkPassword: jest.fn().mockResolvedValue(true) };
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(fakeUser);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(null);

      const res = await UserService.login('test@example.com', 'pwd');
      expect(res).toBe(fakeUser);
    });

    it('dovrebbe effettuare il login correttamente tramite username', async () => {
      const fakeUser = { id: 1, checkPassword: jest.fn().mockResolvedValue(true) };
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(fakeUser);

      const res = await UserService.login('user', 'pwd');
      expect(res).toBe(fakeUser);
    });

    it('dovrebbe lanciare un errore se l\'utente non viene trovato', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(null);

      await expect(UserService.login('x', 'x'))
        .rejects.toThrow('Credenziali errate');
    });

    it('dovrebbe lanciare un errore se la password è errata', async () => {
      const fakeUser = { checkPassword: jest.fn().mockResolvedValue(false) };
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(fakeUser);

      await expect(UserService.login('x', 'wrong'))
        .rejects.toThrow('Credenziali errate');
    });

    it('dovrebbe lanciare un errore se mancano identificativo o password', async () => {
      await expect(UserService.login('', 'pwd'))
        .rejects.toThrow('Credenziali errate');

      await expect(UserService.login('user', ''))
        .rejects.toThrow('Credenziali errate');
    });

    it('dovrebbe lanciare un errore se l\'identificativo è troppo lungo', async () => {
      const longIdentifier = 'a'.repeat(101);

      await expect(UserService.login(longIdentifier, 'validpwd'))
        .rejects.toThrow('Credenziali errate');
    });

    it('dovrebbe lanciare un errore se la password è troppo lunga', async () => {
      const longPwd = 'a'.repeat(201);

      await expect(UserService.login('user', longPwd))
        .rejects.toThrow('Credenziali errate');
    });
  });

  describe('updateUser', () => {
    it('dovrebbe lanciare un errore 404 se l\'utente non esiste', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(UserService.updateUser(1, { username: 'new' }))
        .rejects.toThrow('Utente non trovato');
    });

    it('dovrebbe aggiornare lo username', async () => {
      const fakeUser = { id: 1, username: 'a', save: jest.fn(), icon_id: 1 } as any;
      (UserRepository.findById as jest.Mock).mockResolvedValue(fakeUser);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(null);

      await UserService.updateUser(1, { username: 'newname' });

      expect(fakeUser.username).toBe('newname');
      expect(fakeUser.save).toHaveBeenCalled();
    });

    it('dovrebbe lanciare un errore se il nuovo username è già in uso', async () => {
      const fakeUser = { id: 1, username: 'a', save: jest.fn() } as any;
      (UserRepository.findById as jest.Mock).mockResolvedValue(fakeUser);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue({ id: 2 });

      await expect(UserService.updateUser(1, { username: 'taken' }))
        .rejects.toThrow('Username già in uso');
    });

    it('dovrebbe aggiornare l\'icona se valida', async () => {
      const fakeUser = { id: 1, icon_id: 1, save: jest.fn() } as any;
      (UserRepository.findById as jest.Mock).mockResolvedValue(fakeUser);

      const res = await UserService.updateUser(1, { icon_id: 5 });
      expect(res.icon_id).toBe(5);
    });

    it('dovrebbe lanciare un errore se l\'icona non è valida', async () => {
      const fakeUser = { id: 1, icon_id: 1, save: jest.fn() } as any;
      (UserRepository.findById as jest.Mock).mockResolvedValue(fakeUser);

      await expect(UserService.updateUser(1, { icon_id: 20 }))
        .rejects.toThrow('Id icona non valido. Il valore deve essere tra 1 e 15');
    });

    it('dovrebbe aggiornare la password effettuando l\'hash', async () => {
      const fakeUser = { id: 1, password: 'oldpass', save: jest.fn() } as any;
      (UserRepository.findById as jest.Mock).mockResolvedValue(fakeUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashedNewPass');

      const result = await UserService.updateUser(1, { password: 'newpassword' });

      expect(result.password).toBe('hashedNewPass');
      expect(fakeUser.save).toHaveBeenCalled();
    });

    it('dovrebbe lanciare un errore se il nuovo username è troppo corto', async () => {
      const fakeUser = { id: 1, username: 'old', save: jest.fn() } as any;
      (UserRepository.findById as jest.Mock).mockResolvedValue(fakeUser);

      await expect(
        UserService.updateUser(1, { username: 'a' })
      ).rejects.toThrow('Username troppo corto');
    });

    it('dovrebbe lanciare un errore se la nuova password è troppo corta', async () => {
      const fakeUser = { id: 1, save: jest.fn() } as any;
      (UserRepository.findById as jest.Mock).mockResolvedValue(fakeUser);

      await expect(
        UserService.updateUser(1, { password: '123' })
      ).rejects.toThrow('Password troppo corta');
    });
  });

  describe('deleteUser', () => {
    it('dovrebbe eliminare l\'utente', async () => {
      (UserRepository.delete as jest.Mock).mockResolvedValue(true);

      await expect(UserService.deleteUser({ id: 1 } as any))
        .resolves.not.toThrow();
    });

    it('dovrebbe lanciare un errore se l\'eliminazione fallisce', async () => {
      (UserRepository.delete as jest.Mock).mockResolvedValue(false);

      await expect(UserService.deleteUser({ id: 1 } as any))
        .rejects.toThrow('Errore durante eliminazione dell\'utente');
    });
  });

  describe('requestPasswordReset', () => {
    it('dovrebbe creare un token e inviare l\'email di reset', async () => {
      (PasswordResetRepository.create as jest.Mock).mockResolvedValue('token');
      (sendEmail as jest.Mock).mockResolvedValue(true);

      const fakeUser = { id: 1, email: 'test@test.com' } as any;

      await UserService.requestPasswordReset(fakeUser, 'http://frontend.com');

      expect(PasswordResetRepository.create).toHaveBeenCalledWith(1);
      expect(sendEmail).toHaveBeenCalled();
    });

    it('dovrebbe lanciare un errore se l\'invio dell\'email fallisce', async () => {
      (PasswordResetRepository.create as jest.Mock).mockResolvedValue('token');
      (sendEmail as jest.Mock).mockRejectedValue(new Error('fail'));

      const fakeUser = { id: 1, email: 'x@test.com' } as any;

      await expect(
        UserService.requestPasswordReset(fakeUser, 'url')
      ).rejects.toThrow('Impossibile inviare la mail per il reset');
    });

    it('dovrebbe propagare l\'errore se la creazione del token fallisce', async () => {
      (PasswordResetRepository.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      const fakeUser = { id: 1, email: 'x@test.com' };

      await expect(
        UserService.requestPasswordReset(fakeUser as any, 'url')
      ).rejects.toThrow('DB error');
    });
  });

  describe('resetPassword', () => {

    it('dovrebbe lanciare un errore se la nuova password è troppo corta', async () => {
      await expect(
        UserService.resetPassword({ token: 'x', password: '1' })
      ).rejects.toThrow('La password deve essere di almeno 8 caratteri');
    });

    it('dovrebbe lanciare un errore se il token non è valido o scaduto', async () => {
      (PasswordResetRepository.findByToken as jest.Mock).mockResolvedValue(null);

      await expect(
        UserService.resetPassword({ token: 'bad', password: '12345678' })
      ).rejects.toThrow('Link scaduto o non valido');
    });

    it('dovrebbe lanciare un errore se l\'utente associato al token non esiste', async () => {
      (PasswordResetRepository.findByToken as jest.Mock).mockResolvedValue({ user_id: 1 });
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        UserService.resetPassword({ token: 'tok', password: '12345678' })
      ).rejects.toThrow('Utente non trovato');
    });

    it('dovrebbe reimpostare la password correttamente', async () => {
      (PasswordResetRepository.findByToken as jest.Mock).mockResolvedValue({ user_id: 1 });
      (UserRepository.findById as jest.Mock).mockResolvedValue({ id: 1, save: jest.fn() } as any);
      (hashPassword as jest.Mock).mockResolvedValue('hashedNew');
      (PasswordResetRepository.delete as jest.Mock).mockResolvedValue(true);

      await UserService.resetPassword({ token: 'tok', password: '12345678' });

      expect(hashPassword).toHaveBeenCalled();
      expect(PasswordResetRepository.delete).toHaveBeenCalledWith('tok');
    });
  });

  describe('getByIdentifier', () => {
    it('dovrebbe recuperare l\'utente tramite email', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue({ id: 1 });
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(null);

      const res = await UserService.getByIdentifier('test@example.com');
      expect(res?.id).toBe(1);
    });

    it('dovrebbe recuperare l\'utente tramite username', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue({ id: 2 });

      const res = await UserService.getByIdentifier('user');
      expect(res?.id).toBe(2);
    });

    it('dovrebbe restituire null se l\'utente non esiste', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(null);

      expect(await UserService.getByIdentifier('x')).toBeNull();
    });
  });

  describe('getById', () => {
    it('dovrebbe restituire l\'utente se trovato', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue({ id: 1 });

      expect(await UserService.getById(1)).toEqual({ id: 1 });
    });

    it('dovrebbe restituire null se l\'utente non esiste', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      expect(await UserService.getById(99)).toBeNull();
    });
  });

  describe('getUsernameById', () => {
    it('dovrebbe restituire lo username se l\'utente esiste', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue({ username: 'user' });

      expect(await UserService.getUsernameById(1)).toBe('user');
    });

    it('dovrebbe restituire null se l\'utente non esiste', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      expect(await UserService.getUsernameById(1)).toBeNull();
    });

    it('dovrebbe propagare un errore del database', async () => {
      (UserRepository.findById as jest.Mock).mockRejectedValue(new Error('DB'));

      await expect(UserService.getUsernameById(1)).rejects.toThrow('DB');
    });
  });

});
