import { supabase } from '../contexts/AuthContext';

/**
 * Проверяет, является ли текущий пользователь администратором
 * @returns {Promise<boolean>} true если пользователь администратор
 */
export const isAdminUser = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Проверяем наличие административных прав через RPC-функцию
    const { data, error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
};