import { createClient } from '@supabase/supabase-js';

// ⚠️ SUBSTITUA PELAS SUAS CREDENCIAIS DO SUPABASE ⚠️
// Você encontra isso em: Project Settings -> API
const SUPABASE_URL = 'https://rlqcbdgjjkcmmlgjpcin.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscWNiZGdqamtjbW1sZ2pwY2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzYyODgsImV4cCI6MjA4MzY1MjI4OH0.sG87pqrfds8PeWzgofSgL83okszVgxHafiip1CxPi00';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);