// ##################################################################################################
// Mix of helper functions for macros.
// v2.1.0
//
// Description:
// This macro exposes mutiple utility functions used by different item macros.
// Exported functions (see each function for documentation):
// - elwinHelpers.doThirdPartyReaction
// - elwinHelpers.getTargetDivs
// - elwinHelpers.hasItemProperty
// - elwinHelpers.reduceAppliedDamage
// - elwinHelpers.getMidiItemChatMessage
// - elwinHelpers.insertTextIntoMidiItemCard
// - elwinHelpers.requirementsSatisfied
// - elwinHelpers.selectTargetsWithinX
// - elwinHelpers.isRangedAttack
// - elwinHelpers.isRangedWeaponAttack
// - elwinHelpers.isMeleeAttack
// - elwinHelpers.isMeleeWeaponAttack
// - elwinHelpers.isMidiHookStillValid
// - elwinHelpers.getTokenName
// - elwinHelpers.getActorSizeValue
// - elwinHelpers.getSizeValue
// - elwinHelpers.buttonDialog
// - elwinHelpers.remoteButtonDialog
// - elwinHelpers.getAttackSegment
// - elwinHelpers.getMoveTowardsPosition
// - elwinHelpers.findMovableSpaceNearDest
// - elwinHelpers.ItemSelectionDialog
// - elwinHelpers.TokenSelectionDialog
//
// ###################################################################################################
export function runElwinsHelpers() {
  const VERSION = '2.1.0';
  const MACRO_NAME = 'elwin-helpers';
  const debug = true;
  const active = true;
  let depReqFulfilled = false;

  const dependencies = ['midi-qol'];
  if (requirementsSatisfied(MACRO_NAME, dependencies)) {
    depReqFulfilled = true;

    // Set ReactionFilter only for midi version before 11.3.13
    if (
      !foundry.utils.isNewerVersion(
        game.modules.get('midi-qol').version ?? '0.0.0',
        '11.3.12.99'
      )
    ) {
      setHook(
        'midi-qol.ReactionFilter',
        'handleReactionFilterHookId',
        handleThirdPartyReactionFilter
      );
    }

    // Set a version to facilitate dependency check
    exportIdentifier('elwinHelpers.version', VERSION);

    // Note: keep this name to be backward compatible
    exportIdentifier('MidiQOL_doThirdPartyReaction', doThirdPartyReaction);
    exportIdentifier('elwinHelpers.doThirdPartyReaction', doThirdPartyReaction);
    exportIdentifier('elwinHelpers.getTargetDivs', getTargetDivs);
    exportIdentifier('elwinHelpers.hasItemProperty', hasItemProperty);
    exportIdentifier('elwinHelpers.reduceAppliedDamage', reduceAppliedDamage);
    exportIdentifier(
      'elwinHelpers.getMidiItemChatMessage',
      getMidiItemChatMessage
    );
    exportIdentifier(
      'elwinHelpers.insertTextIntoMidiItemCard',
      insertTextIntoMidiItemCard
    );
    exportIdentifier(
      'elwinHelpers.requirementsSatisfied',
      requirementsSatisfied
    );
    exportIdentifier('elwinHelpers.selectTargetsWithinX', selectTargetsWithinX);
    exportIdentifier('elwinHelpers.isRangedAttack', isRangedAttack);
    exportIdentifier('elwinHelpers.isRangedWeaponAttack', isRangedWeaponAttack);
    exportIdentifier('elwinHelpers.isMeleeAttack', isMeleeAttack);
    exportIdentifier('elwinHelpers.isMeleeWeaponAttack', isMeleeWeaponAttack);
    exportIdentifier('elwinHelpers.isMidiHookStillValid', isMidiHookStillValid);
    exportIdentifier('elwinHelpers.getTokenName', getTokenName);
    exportIdentifier('elwinHelpers.getActorSizeValue', getActorSizeValue);
    exportIdentifier('elwinHelpers.getSizeValue', getSizeValue);
    exportIdentifier('elwinHelpers.buttonDialog', buttonDialog);
    exportIdentifier('elwinHelpers.remoteButtonDialog', remoteButtonDialog);
    exportIdentifier('elwinHelpers.getAttackSegment', getAttackSegment);
    exportIdentifier(
      'elwinHelpers.getMoveTowardsPosition',
      getMoveTowardsPosition
    );
    exportIdentifier(
      'elwinHelpers.findMovableSpaceNearDest',
      findMovableSpaceNearDest
    );
    // Note: classes need to be exported after they are declared...

    registerRemoteFunctions();
  }

  /**
   * If the requirements are met, returns true, false otherwise.
   *
   * @param {string} name - The name of the item for which to check the dependencies.
   * @param {string[]} dependencies - The array of module ids which are required.
   *
   * @returns {boolean} true if the requirements are met, false otherwise.
   */
  function requirementsSatisfied(name, dependencies) {
    let missingDep = false;
    dependencies.forEach((dep) => {
      if (!game.modules.get(dep)?.active) {
        const errorMsg = `${name} | ${dep} must be installed and active.`;
        ui.notifications.error(errorMsg);
        console.warn(errorMsg);
        missingDep = true;
      }
    });
    return !missingDep;
  }

  /**
   * Removes the previous hook is defined and register a new hook if the macro is active.
   *
   * @param {string} hookName the name of the hook event on which to register the function.
   * @param {string} hookNameId the name of the hook, used for saving a reference to the registered hook.
   * @param {function} hookFunction the function to register on the hook event.
   */
  function setHook(hookName, hookNameId, hookFunction) {
    const hookId = foundry.utils.getProperty(
      globalThis,
      `${MACRO_NAME}.${hookNameId}`
    );
    if (hookId) {
      Hooks.off(hookName, hookId);
    }
    if (active) {
      foundry.utils.setProperty(
        globalThis,
        `${MACRO_NAME}.${hookNameId}`,
        Hooks.on(hookName, hookFunction)
      );
    }
  }

  /**
   * Removes a previously exported function or variable and exports the specifed function or variable if the macro is active.
   *
   * @param {string} exportedIdentifierName the name of the exported function.
   * @param {function} exportedValue the function or variable to export.
   */
  function exportIdentifier(exportedIdentifierName, exportedValue) {
    if (globalThis[exportedIdentifierName]) {
      delete globalThis[exportedIdentifierName];
    }
    if (active) {
      foundry.utils.setProperty(
        globalThis,
        exportedIdentifierName,
        exportedValue
      );
    }
  }

  /**
   * Filters the received reactions. If the item that triggered the manual reaction is a
   * third party reaction source item, removes all reactions that are not the source item.
   *
   * @param {Array} reactions Array of reaction items and/or Magic Items 2 references.
   * @param {object} options Reaction options (should contain the item that triggered the reaction)
   * @param {string} triggerType Type of reaction that was triggered.
   * @param {Array} reactionItemList list of reaction item UUIDs and/or Magic Items 2 references.
   *
   * @returns {boolean} true if the filtered reactions contains at least one item, false otherwise.
   */
  function handleThirdPartyReactionFilter(reactions, options, triggerType, _) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handleThirdPartyReactionFilter`, {
        reactions,
        options,
        triggerType,
      });
    }
    // Only filter when reactionmanual was triggered and the item triggering it was a third party reaction.
    if (
      triggerType !== 'reactionmanual' ||
      !options?.thirdPartyReaction?.trigger ||
      !options?.thirdPartyReaction?.itemUuid
    ) {
      return true;
    }
    // Only keep manual reactions matching item uuid
    const reactionToKeep = reactions.find(
      (itemRef) =>
        itemRef instanceof CONFIG.Item.documentClass &&
        itemRef.uuid === options?.thirdPartyReaction?.itemUuid
    );
    reactions.length = 0;
    if (reactionToKeep) {
      reactions.push(reactionToKeep);
    }
    return reactions.length > 0;
  }

  /**
   * Validates if the conditions for a reaction item are met before sending a remote request to prompt a dialog with
   * the reaction to the player associated to the reaction item's owner and execute it if the player selects it.
   *
   * @example
   *  if (args[0].tag === "TargetOnUse" && args[0].macroPass === "isAttacked") {
   *    const targetToken = token; // or options.token
   *
   *    // TODO Check required conditions for the reaction to trigger
   *
   *    const result = await elwinHelpers.doThirdPartyReaction(
   *      workflow.item,
   *      targetToken,
   *      macroItem,
   *      "isAttacked",
   *      {attackRoll: workflow.attackRoll}
   *    );
   *    if (result?.uuid === macroItem.uuid) {
   *      // Do things that must be done in the attackers workflow
   *    }
   *  }
   *
   * The reaction item can protect against manual triggering with a preTargeting on use item by validating
   * the workflow.options:
   *  if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
   *    if (
   *      workflow.options?.thirdPartyReaction?.trigger !== "isAttacked" ||
   *      workflow.options?.thirdPartyReaction?.itemUuid !== rolledItem.uuid
   *    ) {
   *      // Reaction should only be triggered by aura
   *      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the owner is targeted by a ranged attack.`;
   *      ui.notifications.warn(msg);
   *      return false;
   *    }
   *    return true;
   *  }
   *
   * @see {@link https://discord.com/channels/915186263609454632/1178366243812684006/1178366243812684006} Arrow-Catching Shield
   *
   *
   * @param {Item5e} triggerItem the item that triggered the reaction, usually the item used (workflow.item).
   * @param {Token5e} triggerToken the token which initiated the third party reaction, usually the target of an attack (options.token).
   * @param {Item5e} reactionItem the reaction item to be prompted.
   * @param {string} reactionTriggerName name of the TargetOnUse macroPass on which the reaction that was triggered.
   * @param {object} options reaction options
   * @param {boolean} options.debug  if true will also log some warnings that are considered normal conditions, false by default.
   * @param {Token5e} options.reactionTokenUuid token UUID from which the reaction will executed,
   *                                            if not specified MidiQOL.tokenForActor(reactionItem.actor)?.document.uuid will be used.
   * @param {boolean} options.attackRoll current attackRoll, used to display the reaction flavor depending on the trigger, undefined by default.
   * @param {boolean|undefined} options.showReactionAttackRoll flag to indicate if the attack roll should be shown to the reaction or not,
   *                                                           if undefined the midi setting is used.
   * @param {object} options.reactionOptions options that will be merged with the default ones and passed to the remote reaction.
   *
   * @returns {{name: string, uuid: string, ac: number}} reaction result properties.
   */
  async function doThirdPartyReaction(
    triggerItem,
    triggerToken,
    reactionItem,
    reactionTriggerName,
    options = {
      debug: false,
      reactionTokenUuid: undefined,
      attackRoll: undefined,
    }
  ) {
    // Copied from midi-qol because this utility function is not exposed
    function getReactionSetting(user) {
      if (!user) {
        return 'none';
      }
      return user.isGM
        ? MidiQOL.configSettings().gmDoReactions
        : MidiQOL.configSettings().doReactions;
    }

    const noResult = { name: 'None', uuid: undefined };

    const reactionActor = reactionItem?.actor;
    if (!reactionActor?.flags) {
      console.warn(
        `${MACRO_NAME} | Missing reaction actor or actor flags.`,
        reactionActor
      );
      return noResult;
    }

    let reactionToken = null;
    let reactionTokenUuid = options?.reactionTokenUuid;
    if (reactionTokenUuid) {
      reactionToken = fromUuidSync(reactionTokenUuid);
    } else {
      reactionToken = MidiQOL.tokenForActor(reactionActor);
      reactionTokenUuid = reactionToken?.document.uuid;
    }
    if (!reactionToken) {
      console.warn(
        `${MACRO_NAME} | No token for the reaction actor could be found.`,
        {
          reactionActor,
          reactionTokenUuid,
        }
      );
      return noResult;
    }

    if (MidiQOL.checkRule('incapacitated')) {
      if (MidiQOL.checkIncapacitated(reactionActor)) {
        if (options?.debug) {
          console.warn(
            `${MACRO_NAME} | Actor is incapacitated.`,
            reactionActor
          );
        }
        return noResult;
      }
    }

    const usedReaction = await MidiQOL.hasUsedReaction(reactionActor);
    if (usedReaction) {
      if (options?.debug) {
        console.warn(
          `${MACRO_NAME} | Reaction already used for actor.`,
          reactionActor
        );
      }
      return noResult;
    }

    // If the target is associated to a GM user roll item in this client, otherwise send the item roll to user's client
    let player = MidiQOL.playerForActor(reactionActor);
    if (getReactionSetting(player) === 'none') {
      if (options?.debug) {
        console.warn(
          `${MACRO_NAME} | Reaction settings set to none for player.`,
          player
        );
      }
      return noResult;
    }

    if (!player?.active) {
      // Find first active GM player
      player = game.users?.activeGM;
    }
    if (!player?.active) {
      console.warn(
        `${MACRO_NAME} | No active player or GM for actor.`,
        reactionActor
      );
      return noResult;
    }

    // Note: there is a bug in utils.js that put targetConfirmation but not at the workflowOptions level, remove when fixed (see reactionDialog)
    const reactionOptions = mergeObject(
      {
        itemUuid: triggerItem.uuid,
        thirdPartyReaction: {
          trigger: reactionTriggerName,
          itemUuid: reactionItem.uuid,
        },
        workflowOptions: { targetConfirmation: 'none' },
      },
      options?.reactionOptions ?? {}
    );
    const data = {
      tokenUuid: reactionTokenUuid,
      reactionItemList: [reactionItem.uuid],
      triggerTokenUuid: triggerToken.document.uuid,
      reactionFlavor: getReactionFlavor(
        player,
        reactionTriggerName,
        triggerToken,
        triggerItem,
        reactionToken,
        options.attackRoll,
        options.showReactionAttackRoll
      ),
      triggerType: 'reactionmanual',
      options: reactionOptions,
    };

    return MidiQOL.socket().executeAsUser('chooseReactions', player.id, data);
  }

  /**
   * Returns the reaction flavor for the reaction dialog.
   *
   * @param {User} user the user to which the reaction dialog will be displayed.
   * @param {string} reactionTriggerName name of the TargetOnUse macroPass on which the reaction that was triggered.
   * @param {Token5e} triggerToken the token which initiated the third party reaction, usually the target of an attack (options.token).
   * @param {Item5e} triggerItem the item that triggered the reaction, usually the item used (workflow.item).
   * @param {Token5e} reactionToken the token for which the reaction dialog will be displayed.
   * @param {Roll} attackRoll current attack roll.
   * @param {boolean|undefined} showReactionAttackRoll flag to indicate if the attack roll should be shown to the reaction or not,
   *                                                   if undefined the midi setting is used.
   *
   * @returns {string} the flavor for the reaction trigger.
   */
  function getReactionFlavor(
    user,
    reactionTriggerName,
    triggerToken,
    triggerItem,
    reactionToken,
    attackRoll,
    showReactionAttackRoll
  ) {
    let reactionFlavor = 'Unknow reaction trigger!';
    switch (reactionTriggerName) {
      case 'preAttack':
        reactionFlavor =
          '{actorName} is about to be attacked by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isAttacked':
        reactionFlavor =
          '{actorName} is attacked by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isDamaged':
      case 'preTargetDamageApplication':
        reactionFlavor =
          '{actorName} is damaged by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isHealed':
        reactionFlavor =
          '{actorName} is healed by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'prePreambleComplete':
        reactionFlavor =
          '{actorName} is targeted by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isMissed':
        reactionFlavor =
          '{actorName} is missed by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isCriticalHit':
        reactionFlavor =
          '{actorName} is critically hit by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isFumble':
        reactionFlavor =
          '{actorName} is attacked by {itemName} which fumbled and {reactionActorName} can use a reaction';
        break;
      case 'preTargetSave':
      case 'isAboutToSave':
        reactionFlavor =
          '{actorName} must save because of {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isSaveSuccess':
        reactionFlavor =
          '{actorName} succeeded on a save because of {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isSaveFailure':
        reactionFlavor =
          '{actorName} failed on a save because of {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isMoved':
        reactionFlavor =
          '{actorName} is moved and {reactionActorName} can use a reaction';
        break;
      case 'postTargetEffectApplication':
        reactionFlavor =
          '{actorName} has been applied effects because of {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isHit':
      default:
        reactionFlavor =
          '{actorName} is hit by {itemName} and {reactionActorName} can use a reaction';
        break;
    }
    reactionFlavor = game.i18n.format(reactionFlavor, {
      itemName: triggerItem?.name ?? 'unknown',
      actorName: getTokenPlayerName(user, triggerToken, user?.isGM),
      reactionActorName: reactionToken?.name ?? 'unknown',
    });

    showReactionAttackRoll =
      showReactionAttackRoll ?? MidiQOL.configSettings().showReactionAttackRoll;
    const rollOptions = geti18nOptions('ShowReactionAttackRollOptions');
    if (
      [
        'isHit',
        'isMissed',
        'isCrit',
        'isFumble',
        'isDamaged',
        'isAttacked',
      ].includes(reactionTriggerName)
    ) {
      switch (showReactionAttackRoll) {
        case 'all':
          reactionFlavor = `<h4>${reactionFlavor} - ${rollOptions.all} ${
            attackRoll?.total ?? ''
          }</h4>`;
          break;
        case 'allCrit':
          const criticalString = attackRoll?.isCritical
            ? `<span style="color: green">(${i18n('DND5E.Critical')})</span>`
            : '';
          reactionFlavor = `<h4>${reactionFlavor} - ${rollOptions.all} ${
            attackRoll?.total ?? ''
          } ${criticalString}</h4>`;
          break;
        case 'd20':
          const theRoll = attackRoll?.terms[0]?.results
            ? attackRoll.terms[0].results.find((r) => r.active)?.result ??
              attackRoll.terms[0]?.total
            : attackRoll?.terms[0]?.total ?? '';
          reactionFlavor = `<h4>${reactionFlavor} ${rollOptions.d20} ${theRoll}</h4>`;
          break;
        default:
      }
    }

    return reactionFlavor;
  }

  /**
   * Returns the token name that can be displayed for the specified user.
   * Note: Extended from MidiQOL to allow passing a user instead of taking game.user.
   *
   * @param {User} user user to which the token name will be displayed.
   * @param {Token5e} token the token for which to display the name.
   * @param {boolean} checkGM if true, indicate that a GM user should be shown the token.name.
   *
   * @returns {string} The token name to be displayed to the specified user.
   */
  function getTokenPlayerName(user, token, checkGM = false) {
    if (!token) {
      return game.user?.name;
    }
    let name = getTokenName(token);
    if (checkGM && user?.isGM) {
      return name;
    }
    if (game.modules.get('anonymous')?.active) {
      const api = game.modules.get('anonymous')?.api;
      return api.playersSeeName(token.actor) ? name : api.getName(token.actor);
    }
    return name;
  }

  /**
   * Returns a string containing two midi target divs, one to be displayed to GM and another one to be displayed to players.
   * @param {Token5e} targetToken Token for which to display the name.
   * @param {string} textTemplate Text template which should contain the target variable (${tokenName}) to replaced by the proper one.
   * @returns {string} Div texts for GM and non GM player.
   */
  function getTargetDivs(targetToken, textTemplate) {
    const gmText = textTemplate.replace(
      '${tokenName}',
      getTokenName(targetToken)
    );
    const targetName = MidiQOL.getTokenPlayerName(targetToken);
    const playerText = textTemplate.replace('${tokenName}', targetName);
    if (foundry.utils.isNewerVersion(game.system.version, '3')) {
      return `<div class="midi-qol-gmTokenName">${gmText}</div><div class="midi-qol-playerTokenName">${playerText}</div>`;
    }
    return `<div class="midi-qol-target-npc-GM">${gmText}</div><div class="midi-qol-target-npc-Player">${playerText}</div>`;
  }

  /**
   * Returns true if the item has the property.
   * @param {Item5e} item to test for a property
   * @param {string} propName name of the property to test.
   * @returns {boolean} true if the item has the property, false otherwise.
   */
  function hasItemProperty(item, propName) {
    if (foundry.utils.isNewerVersion(game.system.version, '3')) {
      return item.system?.properties?.has(propName);
    }
    return item.system?.properties?.[propName];
  }

  /**
   * Reduces the applied damage from the damageItem by preventedDmg.
   * @param {object} damageItem MidiQOL damageItem.
   * @param {number} preventedDmg the amount of damage prevented.
   */
  function reduceAppliedDamage(damageItem, preventedDmg) {
    const previousAppliedDmg = damageItem.appliedDamage;
    let remainingPrevDmg = Math.min(previousAppliedDmg, preventedDmg);
    damageItem.appliedDamage -= remainingPrevDmg;
    if (remainingPrevDmg > 0 && damageItem.hpDamage > 0) {
      const hpPrevDmg = Math.min(damageItem.hpDamage, remainingPrevDmg);
      damageItem.hpDamage -= hpPrevDmg;
      damageItem.newHP += hpPrevDmg;
      remainingPrevDmg -= hpPrevDmg;
    }
    if (remainingPrevDmg > 0 && damageItem.tempDamage > 0) {
      const tempHpPrevDmg = Math.min(damageItem.tempDamage, remainingPrevDmg);
      damageItem.tempDamage -= tempHpPrevDmg;
      damageItem.newTempHP += tempHpPrevDmg;
      remainingPrevDmg -= tempHpPrevDmg;
    }
  }

  /**
   * Returns true if the attack is a ranged attack. It also supports melee weapons with the thrown property.
   *
   * @param {Item5e} item the item used to attack.
   * @param {Token5e} sourceToken the attacker's token.
   * @param {Token5e} targetToken the target's token.
   * @param {boolean} checkThrownWeapons flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a ranged attack.
   */
  function isRangedAttack(
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    return isRangedAttackByType(
      ['rwak', 'rsak'],
      item,
      sourceToken,
      targetToken,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack is a ranged weapon attack that hit. It also supports melee weapons
   * with the thrown property.
   *
   * @param {Item5e} item the item used to attack.
   * @param {Token5e} sourceToken the attacker's token.
   * @param {Token5e} targetToken the target's token.
   * @param {boolean} checkThrownWeapons flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a ranged weapon attack that hit
   */
  function isRangedWeaponAttack(
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    return isRangedAttackByType(
      ['rwak'],
      item,
      sourceToken,
      targetToken,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack is a ranged attack. It also supports melee weapons with the thrown property.
   *
   * @param {string[]} actionType array of supported ranged action types.
   * @param {Item5e} item the item used to attack.
   * @param {Token5e} sourceToken the attacker's token.
   * @param {Token5e} targetToken the target's token.
   * @param {boolean} checkThrownWeapons flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a ranged attack.
   */
  function isRangedAttackByType(
    actionTypes,
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    if (actionTypes.includes(item?.system?.actionType)) {
      return true;
    }
    if (!checkThrownWeapons) {
      return false;
    }
    if (item?.system?.actionType !== 'mwak' || !hasItemProperty(item, 'thr')) {
      return false;
    }

    const distance = MidiQOL.computeDistance(sourceToken, targetToken, true);
    // TODO how to support creature with reach, or creatures with reach and thrown weapon?
    const meleeDistance = 5 + (hasItemProperty(item, 'rch') ? 5 : 0);
    return distance > meleeDistance;
  }

  /**
   * Returns true if the attack was a successful melee attack. It also handle the case of
   * weapons with the thrown property on a target that is farther than melee distance.
   *
   * @param {Item5e} item item the item used to attack.
   * @param {Token5e} sourceToken source token.
   * @param {Token5e} targetToken target token.
   * @param {boolean} checkThrownWeapons flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack was a successful melee weapon attack, false otherwise.
   */
  function isMeleeAttack(
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    return isMeleeAttackByType(
      ['mwak', 'msak'],
      item,
      sourceToken,
      targetToken,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack was a successful melee weapon attack. It also handle the case of
   * weapons with the thrown property on a target that is farther than melee distance.
   *
   * @param {Item5e} item item the item used to attack.
   * @param {Token5e} sourceToken source token.
   * @param {Token5e} targetToken target token.
   * @param {boolean} checkThrownWeapons flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack was a successful melee weapon attack, false otherwise.
   */
  function isMeleeWeaponAttack(
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    return isMeleeAttackByType(
      ['mwak'],
      item,
      sourceToken,
      targetToken,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack was a successful melee attack. It also handle the case of
   * weapons with the thrown property on a target that is farther than melee distance.
   *
   * @param {string[]} actionType array of supported melee action types.
   * @param {Item5e} item the used for the attack.
   * @param {Token5e} sourceToken source token.
   * @param {Token5e} targetToken target token.
   * @param {boolean} checkThrownWeapons flag to indicate if the distance must be validated for thrown weapons.
   * @returns {boolean} true if the attack was a successful melee weapon attack, false otherwise.
   */
  function isMeleeAttackByType(
    actionTypes,
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    if (!actionTypes.includes(item?.system?.actionType)) {
      return false;
    }

    if (!checkThrownWeapons) {
      return true;
    }

    if (item?.system?.actionType !== 'mwak' || !hasItemProperty(item, 'thr')) {
      return true;
    }

    const distance = MidiQOL.computeDistance(sourceToken, targetToken, true);
    // TODO how to support creature with reach, or creatures with reach and thrown weapon?
    const meleeDistance = 5 + (hasItemProperty(item, 'rch') ? 5 : 0);
    return distance >= 0 && distance <= meleeDistance;
  }

  /**
   * Selects all the tokens that are within X distance of the source token for the current game user.
   *
   * @param {Token} sourceToken - The reference token from which to compute the distance.
   * @param {number} distance - The distance from the reference token.
   * @param {object} options - Optional parameters.
   * @param {number} [options.disposition=null] - The disposition of tokens: same(1), opposite(-1), neutral(0), ignore(null).
   * @param {boolean} [options.includeSource=false] - Flag to indicate if the reference token should be included or not in the selected targets.
   * @param {boolean} [options.updateSelected=true] - Flag to indicate if the user's target selection should be updated.
   * @param {boolean} [options.isSeen=false] - Flag to indicate if the targets must be sensed by the source token.
   *
   * @returns {Token5e[]} An array of Token instances that were selected.
   */
  function selectTargetsWithinX(
    sourceToken,
    distance,
    options = {
      disposition: null,
      includeSource: false,
      updateSelected: true,
      isSeen: false,
    }
  ) {
    options.disposition ??= null;
    options.includeSource ??= false;
    options.updateSelected ??= true;
    options.isSeen ??= false;

    let aoeTargets = MidiQOL.findNearby(
      options.disposition,
      sourceToken,
      distance,
      {
        isSeen: options.isSeen,
        includeToken: options.includeSource,
      }
    );

    const aoeTargetIds = aoeTargets.map((t) => t.document.id);
    if (options.updateSelected) {
      game.user?.updateTokenTargets(aoeTargetIds);
      game.user?.broadcastActivity({ targets: aoeTargetIds });
    }
    return aoeTargets;
  }

  /**
   * Returns the Midi item chat message for the specified workflow.
   * @param {MidiQOL.workflow} workflow the Midi workflow for which to get the item chat message.
   * @returns {ChatMessage5e} the Midi item chat message for the specified workflow.
   */
  function getMidiItemChatMessage(workflow) {
    if (
      foundry.utils.isNewerVersion(
        game.modules.get('midi-qol').version ?? '0.0.0',
        '11.4.1'
      )
    ) {
      return MidiQOL.getCachedChatMessage(workflow.itemCardUuid);
    }
    return game.messages.get(workflow.itemCardId);
  }

  /**
   * Inserts text into a Midi item chat message before the card buttons div and updates it.
   *
   * @param {string} position the position where to insert the text, supported values: beforeButtons, beforeHitsDisplay.
   * @param {ChatMessage5e} chatMessage the Midi item chat message to update
   * @param {string} text the text to insert in the chat message.
   */
  async function insertTextBeforeButtonsIntoMidiItemChatMessage(
    position,
    chatMessage,
    text
  ) {
    let content = foundry.utils.deepClone(chatMessage.content);
    let searchRegex = undefined;
    let replaceString = `$1\n${text}\n$2`;
    switch (position) {
      case 'beforeHitsDisplay':
        searchRegex = /(<\/div>)(\s*<div class="midi-qol-hits-display">)/m;
        break;
      case 'beforeButtons':
      default:
        searchRegex =
          /(<\/section>)(\s*<div class="card-buttons midi-buttons">)/m;
        if (!foundry.utils.isNewerVersion(game.system.version, '3')) {
          searchRegex = /(<\/div>)(\s*<div class="card-buttons">)/m;
        }
        break;
    }
    if (!foundry.utils.isNewerVersion(game.system.version, '3')) {
      replaceString = `$1\n<br/>${text}\n$2`;
    }
    content = content.replace(searchRegex, replaceString);
    await chatMessage.update({ content: content });
  }

  /**
   * Inserts text into a Midi item chat message before the card buttons div and updates it.
   *
   * @param {string} position the position where to insert the text, supported values: beforeButtons, beforeHitsDisplay.
   * @param {MidiQOL.workflow} workflow the Midi workflow for which to update the item card.
   * @param {string} text the text to insert in the Midi item card.
   */
  async function insertTextIntoMidiItemCard(position, workflow, text) {
    const chatMessage = getMidiItemChatMessage(workflow);
    if (!chatMessage) {
      console.error(`${MACRO_NAME} | Could not find workflow item card`, {
        workflow,
      });
      return;
    }
    await insertTextBeforeButtonsIntoMidiItemChatMessage(
      position,
      chatMessage,
      text
    );
  }

  /**
   * Validates the workflow on which a Midi hook was registered is the same as the one when it is called
   * and that the workflow was not aborted.
   *
   * @param {string} itemName the name of the item which registered the hook.
   * @param {string} hookName the name of the Midi hook.
   * @param {string} actionName the name of the item to be called in the hook.
   * @param {MidiQOL.workflow} originWorkflow the workflow during which the hook was registered.
   * @param {MidiQOL.workflow} currentWorkflow the workflow when the hook is called.
   * @param {boolean} [debug=false] flag to indicate if debug info must be written to the console.
   *
   * @returns {boolean} true is the hook is still valid, false otherwise.
   */
  function isMidiHookStillValid(
    itemName,
    hookName,
    actionName,
    originWorkflow,
    currentWorkflow,
    debug = false
  ) {
    if (originWorkflow !== currentWorkflow) {
      if (debug) {
        // Not same workflow do nothing
        console.warn(
          `${itemName} | ${hookName} hook called from a different workflow.`
        );
      }
      return false;
    }
    if (currentWorkflow.aborted) {
      if (debug) {
        // Workflow was aborted do not trigger action
        console.warn(
          `${itemName} | workflow was aborted, ${actionName} is also cancelled.`
        );
      }
      return false;
    }
    return true;
  }

  class ItemSelectionDialog extends Dialog {
    /**
     * Returns the html content for the dialog generated using the specified values.
     * @param {Item5e[]} items list of items
     * @param {Item5e} defaultItem default item, if null or not part of items, the first one is used.
     * @returns the html content to display in the dialog.
     */
    static async getContent(items, defaultItem) {
      if (!defaultItem || !items.find((t) => t.id === defaultItem?.id)) {
        defaultItem = items[0];
      }
      let itemContent = '';
      for (let item of items) {
        if (!item?.id) {
          continue;
        }
        const selected =
          defaultItem && defaultItem.id === item.id ? ' checked' : '';
        const attunement = {
          [CONFIG.DND5E.attunementTypes.REQUIRED]: {
            cls: '',
            tooltip: game.i18n.localize('DND5E.AttunementRequired'),
          },
          [CONFIG.DND5E.attunementTypes.ATTUNED]: {
            cls: 'active',
            tooltip: game.i18n.localize('DND5E.AttunementAttuned'),
          },
        }[item.system.attunement];
        let equip = undefined;
        if ('equipped' in item.system) {
          equip = {
            cls: item.system.equipped ? 'active' : '',
            tooltip: game.i18n.localize(
              item.system.equipped ? 'DND5E.Equipped' : 'DND5E.Unequipped'
            ),
          };
        }
        const subtitle = [
          item.system.type?.label,
          item.isActive ? item.labels.activation : null,
        ].filterJoin(' &bull; ');
        const tags =
          item.labels.properties
            ?.filter((prop) => prop.icon)
            .map(
              (prop) =>
                `<span aria-label="${prop.label}"><dnd5e-icon src="${prop.icon}"></dnd5e-icon></span>`
            )
            .join(' ') ?? '';

        itemContent += `
      <input id="radio-${item.id}" type="radio" name="item" value="${item.id}"${selected}>
        <label class="item" for="radio-${item.id}">
          <div class="item-name">
            <img class="item-image" src="${item.img}" alt="${item.name}">
            <div class="name name-stacked">
              <span class="title">${item.name}</span>
              <span class="subtitle">${subtitle}</span>
            </div>
            <div class="tags">
              ${tags}
            </div>
          </div>
          <div class="item-controls">
      `;
        if (attunement) {
          itemContent += `
            <a class="item-control ${attunement.cls}" data-tooltip="${attunement.tooltip}">
              <i class="fas fa-sun"></i>
            </a>
        `;
        }
        if (equip) {
          itemContent += `
            <a class="item-control ${equip.cls}" data-tooltip="${equip.tooltip}">
              <i class="fas fa-shield-halved"></i>
            </a>
        `;
        }
        itemContent += `
          </div>
        </label>
      </input>
      `;
      }
      const content = `
          <style>
            .selectItem .item {
              display: flex;
              flex-direction: row;
              align-items: stretch;
              margin: 4px;
            }

            .selectItem input {
              opacity: 0;
              position: absolute;
              z-index: -1;
            }
      
            .selectItem .item .item-name {
              flex: 1;
              display: flex;
              gap: 0.5rem;
              align-items: center;
              line-height: 1;
              position: relative;
            }            
      
            .selectItem .item .item-image {
              border: 2px solid var(--dnd5e-color-gold, ##9f9275);
              box-shadow: 0 0 4px var(--dnd5e-shadow-45, rgb(0 0 0 / 45%));
              border-radius: 0;
              background-color: var(--dnd5e-color-light-gray, #3d3d3d);
              width: 32px;
              height: 32px;
              flex: 0 0 32px;
              cursor: pointer;
              object-fit: cover;
            }

            .selectItem .name-stacked {
              display: flex;
              flex-direction: column;
            }
                 
            .selectItem .item .item-name .title {
              transition: text-shadow 250ms ease;
              font-size: var(--font-size-13);
            }

            .selectItem .name-stacked .subtitle {
              font-family: var(--dnd5e-font-roboto, Roboto, sans-serif);
              font-size: var(--font-size-10, 0.625rem);
              color: var(--color-text-dark-5);
            }
            
            .selectItem .item .item-controls {
              display: flex;
              width: 40px;
              align-items: stretch;
              justify-content: center;
              gap: 0.375rem;
              color: var(--color-text-light-6);
              padding: 0 1.5rem 0 0.25rem;
              position: relative;
            }

            .selectItem .item .item-controls .item-control {
              display: flex;
              align-items: center;
            }

            .selectItem .item .item-controls .item-control.active {
              color: var(--dnd5e-color-black, #4b4a44);
            }

            /* CHECKED STYLES */
            .selectItem [type=radio]:checked + label {
              outline: 3px solid #f00;
            }
          </style>
          
          <form>
            <div class="selectItem">
              <dl>
                ${itemContent}
              </dl>
            </div>
          </form>
      `;
      return content;
    }

    static createDialog(title, items, defaultItem) {
      if (!(items?.length > 0)) {
        return null;
      }
      return new Promise(async (resolve, reject) => {
        const dialog = new this(
          {
            title,
            content: await this.getContent(items, defaultItem),
            buttons: {
              ok: {
                icon: '<i class="fas fa-check"></i>',
                label: 'Select',
                callback: (html) => {
                  const selectedItemId = html.find(
                    "input[type='radio'][name='item']:checked"
                  )[0]?.value;
                  resolve(items.find((t) => t.id === selectedItemId));
                },
              },
            },
            default: 'ok',
            close: () => resolve(null),
          },
          { classes: ['dnd5e', 'dialog'] }
        );
        dialog.render(true);
      });
    }
  }

  // Export class
  if (depReqFulfilled) {
    exportIdentifier('elwinHelpers.ItemSelectionDialog', ItemSelectionDialog);
  }

  /**
   * Utility dialog to select a token from a list of tokens.
   *
   * @example
   * const targets = game.canvas.tokens.placeables;
   * const selectedTarget = await TokenSelectionDialog.createDialog("Select Target", targets, targets?.[0]);
   */
  class TokenSelectionDialog extends Dialog {
    /**
     * Returns the html content for the dialog generated using the specified values.
     * @param {Token5e[]} tokens list of tokens
     * @param {Token5e} defaultToken default token, if null or not part of tokens, the first one is used.
     * @returns the html content to display in the dialog.
     */
    static async getContent(tokens, defaultToken) {
      let tokenContent = '';
      if (!defaultToken || !tokens.find((t) => t.id === defaultToken?.id)) {
        defaultToken = tokens[0];
      }
      for (let token of tokens) {
        if (!token?.id) {
          continue;
        }
        const selected =
          defaultToken && defaultToken.id === token.id ? ' checked' : '';
        const tokenImg = await getTokenImage(token);
        const tokenName = MidiQOL.getTokenPlayerName(token, true);
        tokenContent += `<div style="flex-grow: 1"><label class="radio-label">
        <input type="radio" name="token" value="${token.id}"${selected}>
        <img id="${token.document.uuid}" src="${tokenImg}" style="border:0px; width: 50px; height:50px;">
        ${tokenName}
      </label></div>`;
      }

      let content = `
          <style>
            .selectToken .form-group {
              display: flex;
              flex-wrap: wrap;
              width: 100%;
              align-items: flex-start;
            }
      
            .selectToken .radio-label {
              display: flex;
              flex-direction: row;
              align-items: center;
              margin: 4px;
              text-align: center;
              justify-items: center;
              flex: 1 0 25%;
              line-height: normal;
            }
      
            .selectToken .radio-label input {
              opacity: 0;
              position: absolute;
              z-index: -1;
            }
      
            .selectToken img {
              border: 0px;
              width: 50px;
              height: 50px;
              flex: 0 0 50px;
              margin-right: 3px;
              cursor: pointer;
            }
      
            /* CHECKED STYLES */
            .selectToken [type=radio]:checked + img {
              outline: 3px solid #f00;
            }
          </style>
          
          <form>
            <div class="selectToken">
              <div class="form-group" id="tokens">
              <dl>
                  ${tokenContent}
              </dl>
              </div>
            </div>
          </form>
      `;
      return content;
    }

    /** @inheritdoc */
    activateListeners(html) {
      super.activateListeners(html);

      if (canvas) {
        let imgs = html[0].getElementsByTagName('img');
        for (let i of imgs) {
          i.style.border = 'none';
          i.closest('.radio-label').addEventListener(
            'click',
            async function () {
              const token = getToken(i.id);
              //@ts-expect-error .ping
              if (token) await canvas?.ping(token.center);
            }
          );
          i.closest('.radio-label').addEventListener('mouseover', function () {
            const token = getToken(i.id);
            if (token) {
              //@ts-expect-error .ping
              token.hover = true;
              token.refresh();
            }
          });
          i.closest('.radio-label').addEventListener('mouseout', function () {
            const token = getToken(i.id);
            if (token) {
              //@ts-expect-error .ping
              token.hover = false;
              token.refresh();
            }
          });
        }
      }
    }

    /**
   * A helper constructor function which displays the token selection dialog.
   *
   * @param {string} title The title to display.
   * @param {Token5e[]} tokens List of tokens from which to select a token.
   * @param {Token5e} defaultToken If specified, token to be selected by default,
   *                               if null or not part of tokens, the first one is used.

   *
   * @returns {Promise<Token5e|null>}  Resolves with the selected token, if any.
   */
    static createDialog(title, tokens, defaultToken) {
      if (!(tokens?.length > 0)) {
        return null;
      }
      return new Promise(async (resolve, reject) => {
        const dialog = new this(
          {
            title,
            content: await this.getContent(tokens, defaultToken),
            buttons: {
              ok: {
                icon: '<i class="fas fa-check"></i>',
                label: 'Select', // TODO localize
                callback: (html) => {
                  const selectedTokenId = html.find(
                    "input[type='radio'][name='token']:checked"
                  )[0]?.value;
                  resolve(tokens.find((t) => t.id === selectedTokenId));
                },
              },
            },
            default: 'ok',
            close: () => resolve(null),
          },
          { classes: ['dnd5e', 'dialog'] }
        );
        dialog.render(true);
      });
    }
  }

  // Export class
  if (depReqFulfilled) {
    exportIdentifier('elwinHelpers.TokenSelectionDialog', TokenSelectionDialog);
  }

  /**
   * Returns the numeric value of the specified actor's size value.
   *
   * @param {Actor5e} actor actor for which to get the size value.
   * @returns {number} the numeric value of the specified actor's size value.
   */
  function getActorSizeValue(actor) {
    return getSizeValue(actor?.system?.traits?.size ?? 'med');
  }

  /**
   * Returns the numeric value of the specified size.
   *
   * @param {string} size  the size name for which to get the size value.
   * @returns {number} the numeric value of the specified size.
   */
  function getSizeValue(size) {
    return Object.keys(CONFIG.DND5E.actorSizes).indexOf(size ?? 'med');
  }

  /**
   * Helper function to create a simple dialog with labeled buttons and associated data.
   *
   * @param {object} data dialog's data.
   * @param {{label: string, value: object}[]} [data.buttons] buttons to be displayed in the dialog.
   * @param {string} [data.title] dialog's title.
   * @param {string} [data.content] dialog's html content.
   * @param {object} [data.options] dialog's options.
   * @param {string} [direction = 'row'] 'column' or 'row' accepted. Controls layout direction of the dialog's buttons.
   *
   * @returns {object} the value associated to the selected button.
   */
  async function buttonDialog(data, direction) {
    const buttons = {};

    data.buttons.forEach((button) => {
      buttons[button.label] = {
        label: button.label,
        callback: () => button.value,
      };
    });

    const render = (html) =>
      html.find('.dialog-buttons').css({
        'flex-direction': direction,
      });

    return await Dialog.wait(
      {
        title: data.title,
        content: data.content ?? '',
        buttons,
        render,
        close: () => null,
      },
      { classes: ['dnd5e', 'dialog'], height: '100%', ...data.options },
      {}
    );
  }

  /**
   * Helper function to create a simple dialog with labeled buttons and associated data.
   *
   * @param {object} data dialog's data.
   * @param {{label: string, value: object}[]} [data.buttons] buttons to be displayed in the dialog.
   * @param {string} [data.title] dialog's title.
   * @param {string} [data.content] dialog's html content.
   * @param {object} [data.options] dialog's options.
   * @param {string} [direction = 'row'] 'column' or 'row' accepted. Controls layout direction of the dialog's buttons.
   *
   * @returns {object} the value associated to the selected button.
   */
  async function remoteButtonDialog(userId, data, direction) {
    return elwinHelpers.socket.executeAsUser(
      'elwinHelpers.remoteButtonDialog',
      userId,
      data,
      direction
    );
  }

  /**
   * Returns the intersection point on the target token between the source token and target token and the ray used to compute the intersection.
   * The possible segments are computed using the same algo as MidiQOL uses to compute attack distances.
   *
   * @param {Token5e} sourceToken source token.
   * @param {Token5e} targetToken target token.
   * @returns {{point: {x: number, y: number}, ray: Ray}} the intersection point between the source token and target token and the ray used to compute the intersection.
   */
  function getAttackSegment(sourceToken, targetToken) {
    if (!canvas || !canvas.scene || !canvas.grid || !canvas.dimensions) {
      return undefined;
    }
    if (!sourceToken || !targetToken) {
      return undefined;
    }

    const segments = getDistanceSegments(sourceToken, targetToken, true);
    if (debug) {
      console.warn(`${MACRO_NAME} | getAttackSegment (getDistanceSegments)`, {
        sourceToken,
        targetToken,
        segments,
      });
    }
    if (segments.length === 0) {
      return undefined;
    }
    const segmentDistances = simpleMeasureDistances(segments, {
      gridSpaces: true,
    });
    if (MidiQOL.configSettings()?.optionalRules.distanceIncludesHeight) {
      const heightDifference = calculateTokeHeightDifference(
        sourceToken,
        targetToken
      );
      segmentDistances.forEach(
        (distance, index, arr) =>
          (arr[index] = getDistanceAdjustedByVerticalDist(
            distance,
            heightDifference
          ))
      );
    }
    if (debug) {
      console.warn(
        `${MACRO_NAME} | getAttackSegment (simpleMeasureDistances)`,
        {
          segments,
          segmentDistances,
        }
      );
    }
    const idxShortestSegment = segmentDistances.indexOf(
      Math.min(...segmentDistances)
    );
    if (idxShortestSegment < 0) {
      return undefined;
    }
    const targetRect = new PIXI.Rectangle(
      targetToken.x,
      targetToken.y,
      targetToken.w,
      targetToken.h
    ).getBounds();
    const targetRay = segments[idxShortestSegment].ray;
    const intersectSegments = targetRect.segmentIntersections(
      targetRay.A,
      targetRay.B
    );
    if (debug) {
      console.warn(`${MACRO_NAME} | getAttackSegment (insersectSegments)`, {
        targetRect,
        targetRay,
        intersectSegments,
      });
    }
    if (!intersectSegments?.length) {
      return undefined;
    }
    return { point: intersectSegments[0], ray: targetRay };
  }

  /**
   * Get the distance segments between two objects. Based on midi-qol code used in getDistance.
   *
   * @param {Token5e} t1 - the first token.
   * @param {Token5e} t2 - the second token.
   * @param {boolean} wallBlocking - whether to consider walls as blocking.
   * @return {{ray: Ray}[]} an array of segments representing the distance between the two tokens.
   */
  function getDistanceSegments(t1, t2, wallBlocking = false) {
    const actor = t1.actor;
    const ignoreWallsFlag = foundry.utils.getProperty(
      actor,
      'flags.midi-qol.ignoreWalls'
    );
    if (ignoreWallsFlag) {
      wallBlocking = false;
    }

    const t1StartX = t1.document.width >= 1 ? 0.5 : t1.document.width / 2;
    const t1StartY = t1.document.height >= 1 ? 0.5 : t1.document.height / 2;
    const t2StartX = t2.document.width >= 1 ? 0.5 : t2.document.width / 2;
    const t2StartY = t2.document.height >= 1 ? 0.5 : t2.document.height / 2;

    let x, x1, y, y1;
    let segments = [];
    for (x = t1StartX; x < t1.document.width; x++) {
      for (y = t1StartY; y < t1.document.height; y++) {
        const origin = new PIXI.Point(
          //        ...canvas.grid.getCenter(
          Math.round(t1.document.x + canvas.dimensions.size * x),
          Math.round(t1.document.y + canvas.dimensions.size * y)
          //       )
        );
        for (x1 = t2StartX; x1 < t2.document.width; x1++) {
          for (y1 = t2StartY; y1 < t2.document.height; y1++) {
            const dest = new PIXI.Point(
              //            ...canvas.grid.getCenter(
              Math.round(t2.document.x + canvas.dimensions.size * x1),
              Math.round(t2.document.y + canvas.dimensions.size * y1)
              //          )
            );
            const r = new Ray(origin, dest);
            if (wallBlocking) {
              const collisionCheck =
                CONFIG.Canvas.polygonBackends.move.testCollision(origin, dest, {
                  mode: 'any',
                  type: 'move',
                });
              if (debug) {
                console.warn(`${MACRO_NAME} | getDistanceSegments`, {
                  segment: { ray: r },
                  collisionCheck,
                });
              }
              if (collisionCheck) {
                continue;
              }
            }
            segments.push({ ray: r });
          }
        }
      }
    }
    return segments;
  }

  /**
   * Based on midi-qol measureDistances function.
   * Measure distances for given segments with optional grid spaces.
   *
   * @param {{{ray: Ray}}[]} segments - Array of segments to measure distances for.
   * @param {object} options - Optional object with grid spaces configuration.
   * @return {number[]} Array of distances for each segment.
   */
  function simpleMeasureDistances(segments, options = {}) {
    if (
      canvas?.grid?.grid.constructor.name !== 'BaseGrid' ||
      !options.gridSpaces
    ) {
      const distances = canvas?.grid?.measureDistances(segments, options);
      return distances;
    }

    const rule = canvas?.grid.diagonalRule;
    if (!options.gridSpaces || !['555', '5105', 'EUCL'].includes(rule)) {
      return canvas?.grid?.measureDistances(segments, options);
    }
    // Track the total number of diagonals
    let nDiagonal = 0;
    const d = canvas?.dimensions;

    const grid = canvas?.scene?.grid;
    if (!d || !d.size) return 0;

    // Iterate over measured segments
    return segments.map((s) => {
      const r = s.ray;
      // Determine the total distance traveled
      const nx = Math.ceil(Math.max(0, Math.abs(r.dx / d.size)));
      const ny = Math.ceil(Math.max(0, Math.abs(r.dy / d.size)));
      // Determine the number of straight and diagonal moves
      const nd = Math.min(nx, ny);
      const ns = Math.abs(ny - nx);
      nDiagonal += nd;

      if (rule === '5105') {
        // Alternative DMG Movement
        const nd10 =
          Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
        const spaces = nd10 * 2 + (nd - nd10) + ns;
        return spaces * d.distance;
      } else if (rule === 'EUCL') {
        // Euclidean Measurement
        const nx = Math.max(0, Math.abs(r.dx / d.size));
        const ny = Math.max(0, Math.abs(r.dy / d.size));
        return Math.ceil(Math.hypot(nx, ny) * grid?.distance);
      } else {
        // Standard PHB Movement
        return Math.max(nx, ny) * grid.distance;
      }
    });
  }

  /**
   * Calculate the height difference between two tokens based on their elevation and dimensions.
   *
   * @param {Token5e} t1 - the first token.
   * @param {Token5e} t2 - the second token.
   * @return {number} the height difference between the two tokens
   */
  function calculateTokeHeightDifference(t1, t2) {
    const t1Elevation = t1.document.elevation ?? 0;
    const t2Elevation = t2.document.elevation ?? 0;
    const t1TopElevation =
      t1Elevation +
      Math.max(t1.document.height, t1.document.width) *
        (canvas?.dimensions?.distance ?? 5);
    const t2TopElevation =
      t2Elevation +
      Math.min(t2.document.height, t2.document.width) *
        (canvas?.dimensions?.distance ?? 5);

    let heightDifference = 0;
    let t1ElevationRange =
      Math.max(t1.document.height, t1.document.width) *
      (canvas?.dimensions?.distance ?? 5);
    if (Math.abs(t2Elevation - t1Elevation) < t1ElevationRange) {
      // token 2 is within t1's size so height difference is functionally 0
      heightDifference = 0;
    } else if (t1Elevation < t2Elevation) {
      // t2 above t1
      heightDifference = t2Elevation - t1TopElevation;
    } else if (t1Elevation > t2Elevation) {
      // t1 above t2
      heightDifference = t1Elevation - t2TopElevation;
    }

    return heightDifference;
  }

  /**
   * Returns the total measured distance for the specified horizDistance and vertDistance.
   *
   * @param {number} horizDistance - horizontal distance.
   * @param {number} vertDistance - vertical distance.
   * @returns {number} the total measured distance including the vertical distance.
   */
  function getDistanceAdjustedByVerticalDist(horizDistance, vertDistance) {
    const rule = canvas.grid.diagonalRule;
    let distance = horizDistance;
    if (['555', '5105'].includes(rule)) {
      let nd = Math.min(horizDistance, vertDistance);
      let ns = Math.abs(horizDistance - vertDistance);
      distance = nd + ns;
      let dimension = canvas?.dimensions?.distance ?? 5;
      if (rule === '5105') {
        distance = distance + Math.floor(nd / 2 / dimension) * dimension;
      }
    } else {
      distance = Math.sqrt(
        vertDistance * vertDistance + horizDistance * horizDistance
      );
    }
    return distance;
  }

  /**
   * Returns the position where to move the token so its border is next to the specified point.
   *
   * @param {Token5e} token - the token to be moved.
   * @param {{x: number, y: number}} point - the point next to which to move the token.
   * @param {object} options - Options
   * @param {boolean} [options.snapToGrid] - if the the returned position will be snapped to grid or not.
   *
   * @returns {{x: number, y: number}} the position where to move the token so its border is next to the specified point.
   */
  function getMoveTowardsPosition(
    token,
    point,
    options = { snapToGrid: true }
  ) {
    const moveTowardsRay = new Ray(token.center, point);
    const tokenIntersects = token.bounds.segmentIntersections(
      moveTowardsRay.A,
      moveTowardsRay.B
    );
    if (!tokenIntersects?.length) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | getMoveTowardsPosition no segmentIntersections found`,
          {
            tokenBounds: token.bounds,
            moveTowardsRay,
          }
        );
      }
      return undefined;
    }
    const centerToBounds = new Ray(moveTowardsRay.A, tokenIntersects[0]);

    const rayToCenter = Ray.towardsPoint(
      moveTowardsRay.A,
      moveTowardsRay.B,
      moveTowardsRay.distance - centerToBounds.distance
    );
    const tokenPos = {
      x: rayToCenter.B.x - token.w / 2,
      y: rayToCenter.B.y - token.h / 2,
    };
    let tokenPosSnapped = undefined;
    if (options?.snapToGrid && canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
      const isTiny = token.document.width < 1 && token.document.height < 1;
      const interval = canvas.grid.isHex ? 1 : isTiny ? 2 : 1;
      tokenPosSnapped = canvas.grid.getSnappedPosition(
        tokenPos.x,
        tokenPos.y,
        interval,
        { token }
      );
    }
    if (debug) {
      console.warn(`${MACRO_NAME} | getMoveTowardsPosition`, {
        tokenPos,
        tokenPosSnapped,
      });
    }
    return tokenPosSnapped ? tokenPosSnapped : tokenPos;
  }

  /**
   * Returns a position near the specified destPos where the specified token can be moved.
   * There must be no collision betwen the token current position and the token destination position,
   * if the destination position is occupied an altenative position can be returned but there must be no
   * collision between the initial destination position and the new proposed one.
   * An unoccupied space will be prioritized over an occupied one. If a nearToken is specified
   * the position returned must be adjacent to this token.
   *
   * @param {Token5e} token - the token for which to find a space where it could be moved.
   * @param {{x: number, y: number}} destPos - the token's tentative destination position.
   * @param {Token5e} nearToken - if defined, the final position of the token must be adjacent to this token.
   * @returns {{pos: {x: number, y: number}, occupied: boolean}} the token's preferred final destination with a flag to indicate if its already occupied by another token.
   */
  function findMovableSpaceNearDest(token, destPos, nearToken) {
    const tokenInitialDestBounds = new PIXI.Rectangle(
      destPos.x,
      destPos.y,
      token.w,
      token.h
    ).getBounds();
    if (
      token.checkCollision(tokenInitialDestBounds.center, {
        type: 'move',
        mode: 'any',
      })
    ) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | findMovableSpaceNearDest (wall collision initial destination)`,
          {
            tokenCenterPos: token.center,
            tokenDestCenterPos: tokenInitialDestBounds.center,
            wallCollision: true,
          }
        );
      }
      return undefined;
    }

    const size = Math.max(token.document.width, token.document.height);
    const isTiny = size < 1;
    let interval = 0;
    let gridIncrement = 1;
    let gridDistance = size;
    if (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
      interval = canvas.grid.isHex ? 1 : isTiny ? 2 : 1;
      gridIncrement = canvas.grid.isHex || !isTiny ? 1 : size;
      gridDistance = isTiny ? 1 : size;
    }

    const posGen = nearbyPositionsGenerator(
      destPos,
      gridIncrement,
      gridDistance
    );

    let nearTokenShape = undefined;
    if (nearToken) {
      if (canvas.grid.isHex) {
        // Use padded poly otherwise overlaps does not work for certain adjacent grid spaces.
        const points = canvas.grid.grid.getBorderPolygon(
          nearToken.document.width,
          nearToken.document.height,
          CONFIG.Canvas.objectBorderThickness
        );
        nearTokenShape = new PIXI.Polygon(points).translate(
          nearToken.x,
          nearToken.y
        );
      } else {
        nearTokenShape = nearToken.bounds;
      }
    }

    const quadtree = canvas.tokens.quadtree;
    let collisionTest = (o, r) => o.t.id !== token.id && o.r.intersects(r);
    if (canvas.grid.isHex) {
      collisionTest = (o, _) => {
        if (o.t.id === token.id) {
          return false;
        }
        const points = canvas.grid.grid.getBorderPolygon(
          o.t.document.width,
          o.t.document.height,
          -CONFIG.Canvas.objectBorderThickness
        );
        currentTokenShape = new PIXI.Polygon(points).translate(o.t.x, o.t.y);
        return currentTokenShape.overlaps(token.testCollisitionShape);
      };
    }
    let testIter = null;
    const unoccupiedDestinations = [];
    const occupiedDestinations = [];

    while (!(testIter = posGen.next()).done) {
      const testPos = testIter.value;
      const testPosSnapped = canvas.grid.getSnappedPosition(
        testPos.x,
        testPos.y,
        interval,
        { token }
      );
      let adjTargetShape;
      let adjTargetForNeighborTestShape;

      if (canvas.grid.isHex) {
        if (isTiny) {
          // For Tiny in hex grid we use a complete grid space to test touches near token
          const tmpPos = canvas.grid.getSnappedPosition(
            testPos.x,
            testPos.y,
            interval
          );
          const tmpPoints = canvas.grid.grid.getBorderPolygon(1, 1, 0);
          adjTargetForNeighborTestShape = new PIXI.Polygon(tmpPoints).translate(
            tmpPos.x,
            tmpPos.y
          );
        }
        const points = canvas.grid.grid.getBorderPolygon(
          token.document.width,
          token.document.height,
          0
        );
        adjTargetShape = new PIXI.Polygon(points).translate(
          testPosSnapped.x,
          testPosSnapped.y
        );
      } else {
        adjTargetShape = new PIXI.Rectangle(
          testPosSnapped.x,
          testPosSnapped.y,
          token.w,
          token.h
        ).getBounds();
      }

      const paddedAdjTargetShape = adjTargetShape
        .clone()
        .pad(-CONFIG.Canvas.objectBorderThickness);
      const paddedAdjTargetBounds =
        paddedAdjTargetShape instanceof PIXI.Rectangle
          ? paddedAdjTargetShape
          : paddedAdjTargetShape.getBounds();

      let touchesNearToken = true;
      let insideNearToken = false;
      if (nearToken) {
        adjTargetForNeighborTestShape ??= adjTargetShape;
        touchesNearToken = nearTokenShape.overlaps(
          adjTargetForNeighborTestShape
        );
        insideNearToken = nearTokenShape.overlaps(paddedAdjTargetShape);
      }
      if (debug) {
        console.warn(`${MACRO_NAME} | findMovableSpaceNearDest iter`, {
          testPos,
          testPosSnapped,
          testGrid: canvas.grid.grid.getGridPositionFromPixels(
            testPosSnapped.x,
            testPosSnapped.y
          ),
          touchesNearToken,
          insideNearToken,
          nearTokenShape,
          adjTargetShape,
          paddedAdjTargetShape,
        });
      }
      if (!touchesNearToken || insideNearToken) {
        continue;
      }
      const testPosCenter = paddedAdjTargetBounds.center;
      // Test if token can move from destPost to this new position
      const wallCollision = token.checkCollision(testPosCenter, {
        origin: tokenInitialDestBounds.center,
        type: 'move',
        mode: 'any',
      });
      if (wallCollision) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | findMovableSpaceNearDest (wall collision)`,
            {
              testPos,
              testPosCenter,
              origin: token.center,
              wallCollision,
            }
          );
        }
        continue;
      }
      // Set shape on current token to be used by grid collision test
      token.testCollisitionShape = paddedAdjTargetShape;
      const overlappingTokens = quadtree.getObjects(paddedAdjTargetBounds, {
        collisionTest,
      });
      if (debug) {
        console.warn(
          `${MACRO_NAME} | findMovableSpaceNearDest (token collision)`,
          {
            testPos,
            testPosSnapped,
            testPosCenter,
            origin: token.center,
            tokenCollision: !!overlappingTokens.size,
            overlappingTokens,
          }
        );
      }
      if (overlappingTokens.size) {
        // Location occupied by other token keep it in case no other not blocked by wall found
        occupiedDestinations.push(testPosSnapped);
      } else {
        unoccupiedDestinations.push(testPosSnapped);
      }
    }

    if (debug) {
      console.warn(`${MACRO_NAME} | findMovableSpaceNearDest (destinations)`, {
        unoccupiedDestinations,
        occupiedDestinations,
      });
    }
    return unoccupiedDestinations.length
      ? { pos: unoccupiedDestinations[0], occupied: false }
      : occupiedDestinations.length
      ? { pos: occupiedDestinations[0], occupied: true }
      : undefined;
  }

  /**
   * Generator of positions that are around the specified startingPoint up to the specified grid distance.
   * Note: this was inspired by warpgate's PlaceableFit.
   *
   * @param {{x: number, y: number}} startingPoint - the starting position from which to find positions around the starting point.
   * @param {number} gridIncrement - the grid increment to use around the starting point to include in the iteration,
   *                                 fractions of grid distance is allowed but only for square grids, e.g.: 0.5.
   * @param {number} gridDistance - the maximum grid distance around the starting point to include in the iteration.
   * @returns the generator function of positions around the specific startingPoint.
   */
  function* nearbyPositionsGenerator(
    startingPoint,
    gridIncrement,
    gridDistance
  ) {
    const gridLoc = canvas.grid.grid.getGridPositionFromPixels(
      startingPoint.x,
      startingPoint.y
    );
    // Adjust starting location for partial grid distance increment on square grids only
    if (gridIncrement < 1 && canvas.grid.type === CONST.GRID_TYPES.SQUARE) {
      const dim = canvas.dimensions.size;
      gridLoc[0] += (startingPoint.y % dim) / dim;
      gridLoc[1] += (startingPoint.x % dim) / dim;
    }
    // partial grid distance is not supported for types of Grid other than Square
    if (gridIncrement < 1 && canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
      gridIncrement = 1;
    }
    const positions = new Set();

    const seen = (position) => {
      const key = position.join('.');
      if (positions.has(key)) return true;

      positions.add(key);
      return false;
    };

    seen(gridLoc);
    let queue = [gridLoc];
    let ring = 0;

    /* include seed point in iterator */
    yield { x: startingPoint.x, y: startingPoint.y, ring: -1 };

    while (queue.length > 0 && ring < gridDistance) {
      const next = queue.flatMap((loc) => getNeighbors(loc, gridIncrement));
      queue = next.filter((loc) => !seen(loc));

      for (const loc of queue) {
        const [x, y] = canvas.grid.grid.getPixelsFromGridPosition(...loc);
        yield { x, y, ring };
      }

      ring += gridIncrement;
    }

    return { x: null, y: null, ring: null };
  }

  /**
   * Returns an array of grid locations corresponding to the specified location neighbors.
   *
   * @param {number[]} loc array containing a grid location's a row and column.
   * @param {number} gridIncrement the grid increment, should be 1 for small or larger creatures and 0.5 for tiny ones.
   * @returns {number[][]} array containing the grid locations' row and column of the specified loc neighbors.
   */
  function getNeighbors(loc, gridIncrement) {
    const [row, col] = loc;
    if (gridIncrement < 1 && canvas.grid.type === CONST.GRID_TYPES.SQUARE) {
      let offsets = [
        [-gridIncrement, -gridIncrement],
        [-gridIncrement, 0],
        [-gridIncrement, gridIncrement],
        [0, -gridIncrement],
        [0, gridIncrement],
        [gridIncrement, -gridIncrement],
        [gridIncrement, 0],
        [gridIncrement, gridIncrement],
      ];
      return offsets.map((o) => [row + o[0], col + o[1]]);
    } else {
      return canvas.grid.grid.getNeighbors(row, col);
    }
  }

  //----------------------------------
  // Copied from midi-qol because its not exposed in the API
  function geti18nOptions(key) {
    const translations = game.i18n.translations['midi-qol'] ?? {};
    const fallback = game.i18n._fallback['midi-qol'] ?? {};
    return translations[key] ?? fallback[key] ?? {};
  }

  /**
   * Returns the token name to be displayed in messages.
   * @param {Token5e} entity
   * @returns {string} the token name to be displayed.
   */
  function getTokenName(entity) {
    if (!entity) {
      return '<unknown>';
    }
    if (!(entity instanceof Token)) {
      return '<unknown>';
    }
    if (MidiQOL.configSettings().useTokenNames) {
      return entity.name ?? entity.actor?.name ?? '<unknown>';
    } else {
      return entity.actor?.name ?? entity.name ?? '<unknown>';
    }
  }

  function getToken(tokenRef) {
    if (!tokenRef) {
      return undefined;
    }
    if (tokenRef instanceof Token) {
      return tokenRef;
    }
    if (tokenRef instanceof TokenDocument) {
      return tokenRef.object;
    }
    if (typeof tokenRef === 'string') {
      const entity = MidiQOL.MQfromUuid(tokenRef);
      //@ts-expect-error return cast
      if (entity instanceof TokenDocument) {
        return entity.object;
      }
      if (entity instanceof Actor) {
        return MidiQOL.tokenForActor(entity);
      }
      return undefined;
    }
    if (tokenRef instanceof Actor) {
      return MidiQOL.tokenForActor(tokenRef);
    }
    return undefined;
  }

  /**
   * Returns the token image to display.
   * @param {Token5e} token the token for which to determine the image.
   * @returns {Promise<String>} the token image to display.
   */
  async function getTokenImage(token) {
    let img = token.document?.texture.src ?? token.actor?.img;
    if (
      MidiQOL.configSettings().usePlayerPortrait &&
      token.actor?.type === 'character'
    ) {
      img = token.actor?.img ?? token.document?.texture.src;
    }
    if (VideoHelper.hasVideoExtension(img ?? '')) {
      img = await game.video.createThumbnail(img ?? '', {
        width: 100,
        height: 100,
      });
    }
    return img;
  }

  ////////////////// Remote functions ///////////////////////////////

  function registerRemoteFunctions() {
    const socket = socketlib.registerSystem(game.system.id);
    socket.register('elwinHelpers.remoteButtonDialog', _remoteButtonDialog);

    exportIdentifier('elwinHelpers.socket', socket);
  }

  async function _remoteButtonDialog(data, direction) {
    return await buttonDialog(data, direction);
  }
}
