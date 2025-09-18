import { createClient } from "@supabase/supabase-js";

// Lấy thông tin từ Supabase Project
const supabaseUrl = 'https://desgyiezxeurkcadhrlg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlc2d5aWV6eGV1cmtjYWRocmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTE5MjMsImV4cCI6MjA3MjkyNzkyM30.l-4bcmS6arWz_ti-yNRKwt7fqO6lFXtz01FEFlLJbXE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
