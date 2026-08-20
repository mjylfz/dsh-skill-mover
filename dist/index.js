var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
/**
 * DSH Skill Mover — bundle host half.
 *
 * Exposes a Typert Remote service (`skillMover`) with three endpoints
 * (scan / migrate / remove) that the browser client half calls. The actual
 * scanning and migration logic lives in lib/core.js (shared with the
 * dynamic-plugin version of this plugin).
 *
 * Note: this file is compiled with `tsc` (NOT esbuild) because the `@Remote`
 * decorators need standard (stage-3) semantics, which esbuild lowers to the
 * legacy form the runtime rejects.
 */
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { createCore } from './core.js';
let SkillMoverGateway = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _scan_decorators;
    let _migrate_decorators;
    let _remove_decorators;
    return class SkillMoverGateway extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _scan_decorators = [Remote('scan')];
            _migrate_decorators = [Remote('migrate')];
            _remove_decorators = [Remote('remove')];
            __esDecorate(this, null, _scan_decorators, { kind: "method", name: "scan", static: false, private: false, access: { has: obj => "scan" in obj, get: obj => obj.scan }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _migrate_decorators, { kind: "method", name: "migrate", static: false, private: false, access: { has: obj => "migrate" in obj, get: obj => obj.migrate }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: obj => "remove" in obj, get: obj => obj.remove }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        core = __runInitializers(this, _instanceExtraInitializers);
        constructor(ctx) {
            super(ctx, 'skillMover');
            this.core = createCore(ctx);
        }
        /**
         * Scan all agent skill directories and build conflict groups.
         *
         * Note: parameters must be plain identifiers without defaults — the Typert
         * gateway derives wire signatures by parsing the method source, and
         * defaults/destructuring make it throw `signature-invalid`.
         */
        async scan(input) {
            return await this.core.runScan(input?.overrides ?? {});
        }
        /** Migrate the selected skills (copy mode). */
        async migrate(input) {
            return await this.core.runMigrate(input ?? {});
        }
        /** Remove previously migrated skills (rollback). */
        async remove(input) {
            return await this.core.runRemove(input ?? {});
        }
    };
})();
export default SkillMoverGateway;
