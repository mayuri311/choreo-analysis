-- Practice videos are created by captains only. Dancers upload retention videos of themselves.
drop policy "add videos" on public.videos;
create policy "add videos" on public.videos
  for insert with check (
    public.is_member()
    and uploaded_by = auth.uid()
    and (
      public.is_captain()
      or (kind = 'retention' and subject_id = auth.uid())
    )
  );
