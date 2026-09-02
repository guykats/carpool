<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Represents a parent's browser identity (one row per device/browser that
 * has signed in - see PRD section 4.1). Table name is "parents"; the class
 * is named ParentUser because `Parent` is a reserved word in PHP.
 */
class ParentUser extends Model
{
    use HasFactory;

    protected $table = 'parents';

    protected $fillable = ['uuid', 'name', 'child_id', 'is_admin'];

    protected $casts = [
        'is_admin' => 'boolean',
    ];

    public function child(): BelongsTo
    {
        return $this->belongsTo(Child::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'parent_id');
    }
}
