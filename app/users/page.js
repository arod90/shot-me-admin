'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const { data, error } = await supabase.from('users').select('*');

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data);
      }
      setLoading(false);
    }

    fetchUsers();
  }, []);

  return (
    <div className="h-full overflow-auto p-6 flex">
      <div className="w-1/2 pr-4">
        <h2 className="text-2xl font-bold mb-6 text-white">
          Usuarios Registrados
        </h2>
        {loading ? (
          <p>Cargando usuarios...</p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="bg-[#151B23] rounded-lg p-2 cursor-pointer hover:bg-[#1C2430]"
                onClick={() => setSelectedUser(user)}
              >
                {user.first_name} {user.last_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="w-1/2 pl-4 border-l border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-white">
          Detalles del Usuario
        </h2>
        {selectedUser ? (
          <div className="bg-[#151B23] p-4 rounded-lg">
            <p>
              <strong>Nombre:</strong> {selectedUser.first_name}{' '}
              {selectedUser.last_name}
            </p>
            <p>
              <strong>Email:</strong> {selectedUser.email}
            </p>
            <p>
              <strong>Teléfono:</strong> {selectedUser.phone}
            </p>
            <p>
              <strong>Fecha de Nacimiento:</strong> {selectedUser.date_of_birth}
            </p>
            <p>
              <strong>Eventos Asistidos:</strong> {selectedUser.events_attended}
            </p>
          </div>
        ) : (
          <p>Seleccione un usuario para ver los detalles</p>
        )}
      </div>
    </div>
  );
}
