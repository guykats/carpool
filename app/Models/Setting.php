<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['days', 'departure_time', 'return_time'];

    protected $casts = [
        'days' => 'array',
    ];

    /**
     * There is only ever one settings row. Creates a sane default the
     * first time it's needed instead of requiring a manual seed.
     */
    public static function current(): self
    {
        return static::firstOrCreate([], [
            'days' => ['Monday', 'Wednesday'],
            'departure_time' => '17:00',
            'return_time' => '18:30',
        ]);
    }
}
