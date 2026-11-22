import React from 'react';
import { User, Crown, Calendar, Mail } from 'lucide-react';

export default function GroupMembersList({ members = [] }) {
  if (members.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-500">
        No members currently listed in this group.
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-900 flex items-center">
          <User className="w-4 h-4 mr-2 text-brand-600" />
          Roster ({members.length} {members.length === 1 ? 'Member' : 'Members'})
        </h3>
        <span className="text-xs text-slate-500">
          Max 1 group per student
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {members.map((member) => (
          <div
            key={member.id}
            className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                  member.is_creator
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-brand-50 text-brand-700 border border-brand-200'
                }`}
              >
                {member.is_creator ? <Crown className="w-5 h-5 text-amber-600" /> : member.full_name?.charAt(0) || 'S'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {member.full_name}
                  </span>
                  {member.is_creator && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Creator / Leader
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center">
                    <Mail className="w-3 h-3 mr-1 text-slate-400" />
                    {member.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center sm:text-right">
              <Calendar className="w-3.5 h-3.5 mr-1 sm:hidden" />
              <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
