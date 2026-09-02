<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = ['date', 'time', 'type', 'parent_id', 'child_id'];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ParentUser::class, 'parent_id');
    }

    public function child(): BelongsTo
    {
        return $this->belongsTo(Child::class);
    }

    /**
     * date + time combined into a single moment. Not stored - always
     * computed at read time (see PRD section 4.2.1 / 5).
     */
    public function timestamp(): Carbon
    {
        return Carbon::parse($this->date->format('Y-m-d') . ' ' . $this->time);
    }

    public function isPast(): bool
    {
        return $this->timestamp()->isPast();
    }
}
