-- North-star line shown in the Home "Today's Focus" card (editable).
insert into kalebos_config (key, value) values
('north_star', 'Become the man capable of creating everything else.')
on conflict (key) do nothing;
