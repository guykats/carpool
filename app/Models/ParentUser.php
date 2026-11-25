<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Represents a device/browser identity (one row per device that has signed
 * in - see PRD section 4.1). Table name is "parents"; the class is named
 * ParentUser because `Parent` is a reserved word in PHP. No personal name
 * is collected - identity is purely "which family does this device
 * represent".
 */
class ParentUser extends Model
{
    use HasFactory;

    protected $table = 'parents';

    protected $fillable = ['uuid', 'family_id', 'is_admin'];

    /**
     * A device is admin if flagged itself, or if its family is an admin
     * family. Raw column value is still used for DB queries (e.g. seeder).
     */
    protected function isAdmin(): Attribute
    {
        return Attribute::get(
            fn ($value) => (bool) $value || (bool) $this->family?->is_admin
        );
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'parent_id');
    }
}
