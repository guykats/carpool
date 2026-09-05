<?php

namespace App\Support;

use App\Models\Setting;
use App\Models\Shift;
use Carbon\Carbon;

class ShiftWeek
{
    private const SLOT_TYPES = ['departure_1', 'departure_2', 'departure_3', 'return_1', 'return_2', 'return_3'];
    private const DAY_NAMES = [
        'Sunday' => 0, 'Monday' => 1, 'Tuesday' => 2, 'Wednesday' => 3,
        'Thursday' => 4, 'Friday' => 5, 'Saturday' => 6,
    ];

    /**
     * Generates this week's shift rows on demand if they don't exist yet
     * (PRD 4.2.2 - no seed/cron). Works identically for past or future
     * weeks - there's no restriction on which week can be generated, which
     * is what lets the admin override view manage past weeks too.
     */
    public static function ensureGenerated(Carbon $weekStart): void
    {
        $settings = Setting::current();

        foreach ($settings->days as $dayName) {
            $offset = self::DAY_NAMES[$dayName] ?? null;
            if ($offset === null) {
                continue;
            }

            $date = $weekStart->copy()->addDays($offset)->format('Y-m-d');

            foreach (self::SLOT_TYPES as $type) {
                $time = str_starts_with($type, 'departure') ? $settings->departure_time : $settings->return_time;

                Shift::firstOrCreate(
                    ['date' => $date, 'type' => $type],
                    ['time' => $time]
                );
            }
        }
    }

    public static function present(Shift $shift): array
    {
        return [
            'id' => $shift->id,
            'date' => $shift->date->format('Y-m-d'),
            'time' => substr($shift->time, 0, 5),
            'type' => $shift->type,
            'isPast' => $shift->isPast(),
            'parentId' => $shift->parent_id,
            'familyId' => $shift->family_id,
            'familyName' => $shift->family?->name,
            'seats' => $shift->seats,
        ];
    }
}
