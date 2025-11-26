'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function SupabaseTest() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from('users').select('*');
      if (error) console.log(error);
      else setData(data);
    }
    fetchData();
  }, []);

  if (!data) return <div>Loading...</div>;
  return (
    <div>
      <h1>Test Supabase</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
