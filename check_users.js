// Script temporaneo per verificare e pulire gli utenti
// Eseguire con: node check_users.js

import { storage } from './server/storage.js';

async function checkAndCleanUsers() {
  try {
    // Ottieni tutti gli utenti
    const users = Array.from(storage.getUsers().values());
    console.log(`Utenti totali nel sistema: ${users.length}`);
    
    // Elenca dettagli per ogni utente
    users.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Password hashata: ${user.password.startsWith('$2b$')}`);
    });
    
    // Conta gli utenti con password hashata (inizia con $2b$)
    const hashedUsers = users.filter(user => user.password.startsWith('$2b$'));
    console.log(`Utenti con password hashata: ${hashedUsers.length}`);
    
    // Identifica gli utenti con password non hashata
    const nonHashedUsers = users.filter(user => !user.password.startsWith('$2b$'));
    console.log(`Utenti con password non hashata: ${nonHashedUsers.length}`);
    
    // Elimina gli utenti con password non hashata
    const deletedUsers = [];
    for (const user of nonHashedUsers) {
      const deleted = await storage.deleteUser(user.id);
      if (deleted) {
        deletedUsers.push({
          id: user.id,
          username: user.username,
          email: user.email
        });
        console.log(`Utente ID ${user.id} (${user.username}) eliminato`);
      }
    }
    
    // Ottieni la lista aggiornata
    const updatedUsers = Array.from(storage.getUsers().values());
    console.log(`Utenti rimanenti dopo la pulizia: ${updatedUsers.length}`);
    
    return {
      before: users.length,
      after: updatedUsers.length,
      deleted: deletedUsers.length,
      deletedUsers
    };
  } catch (error) {
    console.error('Errore nell\'operazione di pulizia utenti:', error);
    return { error: error.message };
  }
}

// Esegui la funzione principale
checkAndCleanUsers()
  .then(result => console.log('Risultato:', result))
  .catch(err => console.error('Errore:', err));