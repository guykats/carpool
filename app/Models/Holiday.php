<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A date with no club session (Israeli holidays / days of rest, see PRD
 * section 4.2.2). Shifts are never generated for a holiday date - see
 * ShiftWeek::ensureGenerated - and the frontend renders it as a shaded,
 * unassignable day card with the holiday's name instead of a normal
 * shift list.
 */
class Holiday extends Model
{
    protected $fillable = ['date', 'name'];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];
}
