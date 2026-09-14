-- ---------------------------------------------------------------------------
-- Re-fetching the handful of animations stored without cache headers.
--
-- `cache-exercise-gif` uploaded without a `cacheControl`, and Supabase's
-- default for that is `no-cache` — so every view of a stored animation
-- re-downloaded most of a megabyte, which is precisely what keeping a copy was
-- meant to avoid. The function now sets a year and `immutable`, since the
-- bytes are named for a WorkoutX id and never change.
--
-- Clearing `gif_path` makes the next viewer fetch it again, with the right
-- headers this time. Cheap now — only a couple have been opened during
-- development — and it would not be after the catalogue has been browsed, so
-- it happens here rather than later.
--
-- The objects themselves are left in the bucket; the re-upload overwrites
-- them, and an orphan gif is a few hundred kilobytes rather than a problem.
-- ---------------------------------------------------------------------------
update public.exercises
   set gif_path = null
 where gif_path is not null;
